"""데이터 저장/불러오기 담당 파일.

- data/*.json        : 샘플 데이터 (읽기 전용, 내가 직접 고쳐도 됨)
- data/user/*.json   : 내가 쓴 기록 (웹페이지에서 저장하면 여기에 쌓임)

나중에 SQLite나 DB로 바꾸고 싶으면 이 파일의 함수들만 바꾸면 된다.
(app.py는 이 파일의 함수만 부르기 때문)
"""
import json
import os
import shutil
import time
import uuid
from datetime import datetime
from pathlib import Path

from flask import g, has_request_context

BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
USER_DIR = DATA_DIR / "user"


def user_dir():
    """기록을 저장할 폴더. 평소에는 data/user/ 이고, 데모 모드에서는 방문자마다 data/user/<방문자id>/ 로 나뉘어요."""
    visitor = getattr(g, "visitor", None) if has_request_context() else None
    return USER_DIR / visitor if visitor else USER_DIR


def purge_visitors(max_dirs=300, max_age_days=3):
    """데모 서버가 방문자 폴더로 가득 차지 않게, 오래된 폴더를 정리해요."""
    if not USER_DIR.exists():
        return
    dirs = [d for d in USER_DIR.iterdir() if d.is_dir()]
    now = time.time()
    for d in dirs:
        if now - d.stat().st_mtime > max_age_days * 86400:
            shutil.rmtree(d, ignore_errors=True)
    dirs = sorted((d for d in USER_DIR.iterdir() if d.is_dir()), key=lambda d: d.stat().st_mtime)
    for d in dirs[: max(0, len(dirs) - max_dirs)]:
        shutil.rmtree(d, ignore_errors=True)

# 저장할 수 있는 기록 종류 (이 목록에 없는 이름은 거부)
COLLECTIONS = [
    "logs",          # 오늘 공부한 것
    "notes",         # 산업/기업/무역 메모
    "news",          # 저장한 뉴스
    "writings",      # 사설 정리 + 내가 쓴 글
    "phrases",       # 좋은 표현/논리 구조
    "unknowns",      # 모르는 것 / 추가 공부할 것
    "todos",         # 오늘 할 일
    "answers",       # 면접 질문 답변
    "explains",      # 직접 설명해보기
    "jobs",          # 채용공고 분석
    "my_companies",  # 내가 추가한 기업
    "known_terms",   # 외웠다고 표시한 무역 용어
]


def _raw(name):
    with open(DATA_DIR / f"{name}.json", encoding="utf-8") as f:
        return json.load(f)


def load_sample(name):
    """data/ 폴더의 샘플 JSON 읽기. 예: load_sample('industries')
    산업에 "hidden": true 를 적으면 그 산업과 딸린 기업·면접 질문이 화면에서 빠져요. (지우지 않고 숨기기)"""
    data = _raw(name)
    if name not in ("industries", "companies", "interview"):
        return data
    industries = _raw("industries")
    hidden = {i["id"] for i in industries if i.get("hidden")}
    if not hidden:
        return data
    if name == "industries":
        return [i for i in data if i["id"] not in hidden]
    hidden_cos = {c["id"] for c in _raw("companies") if c["industry"] in hidden}
    if name == "companies":
        return [c for c in data if c["industry"] not in hidden]
    return [q for q in data if q["scope"] not in hidden and q["scope"] not in hidden_cos]


def _path(col):
    return user_dir() / f"{col}.json"


def read_all(col):
    path = _path(col)
    if not path.exists():
        return []
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return []


def write_all(col, items):
    user_dir().mkdir(parents=True, exist_ok=True)
    tmp = _path(col).with_suffix(".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)
    os.replace(tmp, _path(col))  # 저장 도중 꺼져도 파일이 깨지지 않게


def add(col, item):
    now = datetime.now()
    item = dict(item)
    item["id"] = uuid.uuid4().hex[:8]
    item.setdefault("date", now.strftime("%Y-%m-%d"))
    item["created"] = now.isoformat(timespec="seconds")
    items = read_all(col)
    items.append(item)
    write_all(col, items)
    return item


def update(col, item_id, fields):
    items = read_all(col)
    for it in items:
        if it["id"] == item_id:
            it.update(fields)
            write_all(col, items)
            return it
    return None


def delete(col, item_id):
    items = read_all(col)
    new_items = [it for it in items if it["id"] != item_id]
    write_all(col, new_items)
    return len(new_items) != len(items)


def get_progress():
    """게임 진행 상황(섬 방문, 퀴즈 통과, 스토리 클리어 등)은 목록이 아니라 하나의 사전(dict)으로 저장."""
    path = user_dir() / "progress.json"
    if not path.exists():
        return {}
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else {}
    except (json.JSONDecodeError, OSError):
        return {}


def save_progress(data):
    user_dir().mkdir(parents=True, exist_ok=True)
    tmp = user_dir() / "progress.tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp, user_dir() / "progress.json")


def export_all():
    data = {col: read_all(col) for col in COLLECTIONS}
    data["progress"] = get_progress()
    return data


def import_all(data):
    """내보낸 JSON을 다시 불러오기 (같은 이름의 기록은 덮어씀)."""
    count = 0
    if isinstance(data.get("progress"), dict):
        save_progress(data["progress"])
    for col in COLLECTIONS:
        if isinstance(data.get(col), list):
            write_all(col, data[col])
            count += 1
    return count
