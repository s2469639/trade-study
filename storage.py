"""데이터 저장/불러오기 담당 파일.

- data/*.json        : 샘플 데이터 (읽기 전용, 내가 직접 고쳐도 됨)
- data/user/*.json   : 내가 쓴 기록 (웹페이지에서 저장하면 여기에 쌓임)

나중에 SQLite나 DB로 바꾸고 싶으면 이 파일의 함수들만 바꾸면 된다.
(app.py는 이 파일의 함수만 부르기 때문)
"""
import json
import os
import uuid
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
USER_DIR = DATA_DIR / "user"

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


def load_sample(name):
    """data/ 폴더의 샘플 JSON 읽기. 예: load_sample('industries')"""
    with open(DATA_DIR / f"{name}.json", encoding="utf-8") as f:
        return json.load(f)


def _path(col):
    return USER_DIR / f"{col}.json"


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
    USER_DIR.mkdir(parents=True, exist_ok=True)
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
    path = USER_DIR / "progress.json"
    if not path.exists():
        return {}
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else {}
    except (json.JSONDecodeError, OSError):
        return {}


def save_progress(data):
    USER_DIR.mkdir(parents=True, exist_ok=True)
    tmp = USER_DIR / "progress.tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp, USER_DIR / "progress.json")


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
