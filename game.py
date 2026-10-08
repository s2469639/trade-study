"""게임 요소(경험치, 레벨, 모자 장식, 섬 스탬프, 오늘의 퀘스트)를 계산하는 파일.

기록(공부한 내용)은 storage.py 가 읽어오고, 여기서는 그 숫자를 점수로 바꿔요.
점수는 따로 저장하지 않고 매번 기록에서 계산해서, 기록을 지우면 점수도 같이 줄어요.
"""
from datetime import date, timedelta

import storage

# 한 번 할 때마다 얻는 경험치(XP)
XP_PER = {
    "logs": 5, "notes": 6, "news": 12, "writings": 15, "phrases": 4,
    "answers": 8, "explains": 12, "jobs": 10, "known_terms": 3,
}
XP_STAMP = 25      # 섬 스탬프 하나
XP_CHAPTER = 60    # 스토리 챕터 클리어 (+ 별 하나당 10)


def _progress_defaults(p):
    p.setdefault("visited", [])
    p.setdefault("quiz", {})
    p.setdefault("chapters", {})
    p.setdefault("seen_level", 1)
    p.setdefault("seen_stamps", [])
    return p


def get_progress():
    return _progress_defaults(storage.get_progress())


def island_stamps(island_id, companies, progress):
    """섬 하나의 스탬프 5개와 달성 여부."""
    comp_ids = {c["id"] for c in companies if c["industry"] == island_id}
    notes = storage.read_all("notes")
    news = storage.read_all("news")
    questions = {q["id"]: q["scope"] for q in storage.load_sample("interview")}
    answers = storage.read_all("answers")
    scopes = {island_id} | comp_ids
    return [
        {"key": "visit", "name": "섬 상륙", "desc": "섬에 처음 발을 디뎠어요",
         "done": island_id in progress["visited"]},
        {"key": "note", "name": "탐험 노트", "desc": "이 산업이나 기업에 메모를 1개 남겨요",
         "done": any((n.get("target_type") == "industry" and n.get("target_id") == island_id) or
                     (n.get("target_type") == "company" and n.get("target_id") in comp_ids) for n in notes)},
        {"key": "news", "name": "뉴스 수집", "desc": "이 산업의 뉴스를 1개 저장해요",
         "done": any(n.get("industry") == island_id or n.get("company_id") in comp_ids for n in news)},
        {"key": "answer", "name": "면접 도전", "desc": "이 산업이나 기업의 면접 질문에 답해요",
         "done": any(questions.get(a.get("question_id")) in scopes for a in answers)},
        {"key": "quiz", "name": "섬 퀴즈 통과", "desc": "섬 퀴즈 3문제 중 2문제 이상 맞혀요",
         "done": bool(progress["quiz"].get(island_id))},
    ]


def daily_quests():
    today = date.today().strftime("%Y-%m-%d")

    def n_today(col):
        return sum(1 for i in storage.read_all(col) if i.get("date") == today)

    quests = [
        ("무역 용어 3개 외우기", n_today("known_terms"), 3, "trade"),
        ("뉴스 1개 정리하기", n_today("news"), 1, "news"),
        ("공부 기록 한 줄 남기기", n_today("logs"), 1, "home"),
        ("면접 질문 1개 답하기", n_today("answers"), 1, "interview"),
    ]
    return [{"text": t, "have": min(h, need), "need": need, "done": h >= need, "go": go}
            for t, h, need, go in quests]


UNLOCK_TEXT = {"level": "레벨 {n}", "stamps": "스탬프 {n}개", "chapters": "스토리 {n}챕터 클리어",
               "streak": "{n}일 연속 공부", "terms": "외운 용어 {n}개"}


SHORT_TEXT = {"level": "Lv.{n}", "stamps": "스탬프 {n}", "chapters": "스토리 {n}", "streak": "{n}일 연속", "terms": "용어 {n}"}


def unlock_short(u):
    return SHORT_TEXT[u["type"]].format(n=u["n"])


def unlock_text(u):
    return UNLOCK_TEXT[u["type"]].format(n=u["n"])


def _activity_counts():
    counts = {}
    for col in ACTIVITY_COLLECTIONS:
        for it in storage.read_all(col):
            d = it.get("date")
            if d:
                counts[d] = counts.get(d, 0) + 1
    return counts


def _streak(counts):
    def run(day):
        n = 0
        while counts.get(day.strftime("%Y-%m-%d"), 0) > 0:
            n += 1
            day -= timedelta(days=1)
        return n
    today = date.today()
    return run(today) or run(today - timedelta(days=1))


def compute_status(companies):
    """XP, 레벨, 해금된 장식/색, 지금 입고 있는 모습, 섬별 스탬프를 한 번에 계산."""
    hats = storage.load_sample("hats")
    progress = get_progress()
    industries = [i["id"] for i in storage.load_sample("industries")]

    xp = 0
    for col, per in XP_PER.items():
        xp += len(storage.read_all(col)) * per
    xp += 2 * sum(1 for t in storage.read_all("todos") if t.get("done"))

    stamps = {iid: island_stamps(iid, companies, progress) for iid in industries}
    stamp_done = sum(1 for s in stamps.values() for x in s if x["done"])
    xp += stamp_done * XP_STAMP
    for ch in progress["chapters"].values():
        xp += XP_CHAPTER + 10 * int(ch.get("stars", 1))

    levels = hats["levels"]
    level = max(i + 1 for i, need in enumerate(levels) if xp >= need)
    cur_need = levels[level - 1]
    next_need = levels[level] if level < len(levels) else None

    # 해금 조건에 쓰는 숫자들
    have = {"level": level, "stamps": stamp_done, "chapters": len(progress["chapters"]),
            "streak": _streak(_activity_counts()), "terms": len(storage.read_all("known_terms"))}
    ok = lambda u: have[u["type"]] >= u["n"]
    items = [dict(it, unlocked=ok(it["unlock"]), need=unlock_text(it["unlock"]), need_short=unlock_short(it["unlock"])) for it in hats["items"]]
    colors = [dict(c, unlocked=ok(c["unlock"]), need=unlock_text(c["unlock"]), need_short=unlock_short(c["unlock"])) for c in hats["colors"]]

    # 옷장 설정: 직접 고른 자리는 그대로, 안 고른 자리는 해금된 것 중 가장 좋은 것(rank)을 자동으로 입어요
    custom = progress.get("custom", {})
    chosen = custom.get("slots", {})
    worn = {}
    for sl in hats["slots"]:
        sid = sl["id"]
        cands = [it for it in items if it["slot"] == sid and it["unlocked"]]
        if sid in chosen:
            pick = next((it for it in cands if it["id"] == chosen[sid]), None)       # 고른 게 없거나 None 이면 안 입기
        else:
            pick = max(cands, key=lambda it: it["rank"], default=None)
        worn[sid] = pick["id"] if pick else None
    color = next((c for c in colors if c["id"] == custom.get("color") and c["unlocked"]), None)
    color = color or next(c for c in colors if c["id"] == "yellow")
    name = (custom.get("name") or hats["player"]["name"]).strip() or hats["player"]["name"]

    next_item = next((it for it in items if it["unlock"]["type"] == "level" and it["unlock"]["n"] == level + 1), None)
    return {
        "xp": xp, "level": level, "cur_need": cur_need, "next_need": next_need,
        "pct": 100 if next_need is None else int((xp - cur_need) / (next_need - cur_need) * 100),
        "equipped": [i for i in worn.values() if i], "worn": worn, "slots": hats["slots"],
        "unlocked_ids": [it["id"] for it in items if it["unlocked"]],
        "hat_items": items, "colors": colors, "next_item": next_item,
        "player": {"name": name, "hat": color["color"], "color_id": color["id"]},
        "custom": custom, "have": have,
        "stamps": stamps, "stamp_done": stamp_done, "stamp_total": 5 * len(industries),
        "chapters_done": len(progress["chapters"]),
        "progress": progress,
    }


def save_closet(payload, status):
    """옷장에서 보낸 설정을 검사해서 저장 (해금 안 된 장식/색은 거절)."""
    progress = get_progress()
    if payload.get("reset"):
        progress.pop("custom", None)
        storage.save_progress(progress)
        return
    custom = dict(progress.get("custom", {}))
    if "name" in payload:
        name = str(payload["name"]).strip()[:8]
        if name:
            custom["name"] = name
        else:
            custom.pop("name", None)
    if "color" in payload:
        c = next((c for c in status["colors"] if c["id"] == payload["color"] and c["unlocked"]), None)
        if c:
            custom["color"] = c["id"]
    if isinstance(payload.get("slots"), dict):
        slots = dict(custom.get("slots", {}))
        valid = {s["id"] for s in status["slots"]}
        for sid, val in payload["slots"].items():
            if sid not in valid:
                continue
            if val == "auto":
                slots.pop(sid, None)
            elif val in (None, "none"):
                slots[sid] = None
            elif any(it["id"] == val and it["slot"] == sid and it["unlocked"] for it in status["hat_items"]):
                slots[sid] = val
        custom["slots"] = slots
    progress["custom"] = custom
    storage.save_progress(progress)


def celebrate(status):
    """이번에 처음 달성한 것(새 스탬프, 레벨업, 새 장식/색)을 찾아서 '봤다'고 표시."""
    progress = status["progress"]
    done_keys = [f"{iid}:{s['key']}" for iid, ss in status["stamps"].items() for s in ss if s["done"]]
    new_stamps = [k for k in done_keys if k not in progress["seen_stamps"]]
    new_level = status["level"] if status["level"] > progress["seen_level"] else None

    unlocked = [it for it in status["hat_items"] if it["unlocked"]] + [c for c in status["colors"] if c["unlocked"]]
    if "seen_items" not in progress:        # 예전 데이터: 레벨로 얻은 장식은 이미 본 걸로 쳐요
        progress["seen_items"] = [x["id"] for x in unlocked if x["unlock"]["type"] == "level"]
    new_things = [x for x in unlocked if x["id"] not in progress["seen_items"]]

    if new_stamps or new_level or new_things or set(done_keys) != set(progress["seen_stamps"]):
        progress["seen_stamps"] = done_keys
        progress["seen_level"] = max(progress["seen_level"], status["level"])
        progress["seen_items"] = sorted(set(progress["seen_items"]) | {x["id"] for x in unlocked})
        storage.save_progress(progress)
    return {"stamps": new_stamps, "level": new_level,
            "items": [{"name": x["name"], "desc": x.get("desc", "새로운 모자 색이에요"), "kind": "색" if "color" in x else "장식"}
                      for x in new_things]}

ACTIVITY_COLLECTIONS = ("logs", "notes", "news", "writings", "phrases", "answers", "explains", "jobs", "known_terms")


def activity_calendar(weeks=14):
    """공부 잔디: 최근 몇 주 동안 하루에 몇 개를 기록했는지 (칸 색깔 0~4단계)와 연속 일수."""
    counts = _activity_counts()
    today = date.today()
    start = today - timedelta(days=today.weekday() + 7 * (weeks - 1))      # 월요일부터 시작하는 주
    level = lambda n: 0 if n == 0 else 1 if n <= 2 else 2 if n <= 5 else 3 if n <= 9 else 4
    grid = []
    for w in range(weeks):
        col = []
        for dow in range(7):
            day = start + timedelta(days=w * 7 + dow)
            key = day.strftime("%Y-%m-%d")
            n = counts.get(key, 0)
            col.append({"date": key, "n": n, "level": level(n), "future": day > today})
        grid.append(col)

    streak = _streak(counts)

    return {"weeks": grid, "streak": streak, "days": len(counts), "weekdays": ["월", "화", "수", "목", "금", "토", "일"]}


def resolve_worn(status, chosen):
    """옷장 미리보기: chosen 은 {자리: '자동' | 'none' | 장식id}. 저장 없이 입은 모습만 계산해요."""
    worn = {}
    for sl in status["slots"]:
        sid = sl["id"]
        cands = [it for it in status["hat_items"] if it["slot"] == sid and it["unlocked"]]
        val = chosen.get(sid, "auto")
        if val == "auto":
            pick = max(cands, key=lambda it: it["rank"], default=None)
        else:
            pick = next((it for it in cands if it["id"] == val), None)
        worn[sid] = pick["id"] if pick else None
    return worn
