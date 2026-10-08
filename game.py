"""게임 요소(경험치, 레벨, 모자 장식, 섬 스탬프, 오늘의 퀘스트)를 계산하는 파일.

기록(공부한 내용)은 storage.py 가 읽어오고, 여기서는 그 숫자를 점수로 바꿔요.
점수는 따로 저장하지 않고 매번 기록에서 계산해서, 기록을 지우면 점수도 같이 줄어요.
"""
from datetime import date

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


def compute_status(companies):
    """XP, 레벨, 착용 중인 모자 장식, 섬별 스탬프를 한 번에 계산."""
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
    unlocked = [it for it in hats["items"] if it["level"] <= level]
    best = {}
    for it in unlocked:                         # 같은 자리(slot)에서는 가장 높은 레벨 장식만 착용
        if it["slot"] not in best or it["level"] > best[it["slot"]]["level"]:
            best[it["slot"]] = it
    next_item = next((it for it in hats["items"] if it["level"] == level + 1), None)

    return {
        "xp": xp, "level": level, "cur_need": cur_need, "next_need": next_need,
        "pct": 100 if next_need is None else int((xp - cur_need) / (next_need - cur_need) * 100),
        "equipped": [it["id"] for it in best.values()],
        "unlocked_ids": [it["id"] for it in unlocked],
        "hat_items": hats["items"], "next_item": next_item,
        "stamps": stamps, "stamp_done": stamp_done, "stamp_total": 5 * len(industries),
        "chapters_done": len(progress["chapters"]),
        "progress": progress,
    }


def celebrate(status):
    """이번에 처음 달성한 것(새 스탬프, 레벨업 장식)을 찾아서 '봤다'고 표시."""
    progress = status["progress"]
    done_keys = [f"{iid}:{s['key']}" for iid, ss in status["stamps"].items() for s in ss if s["done"]]
    new_stamps = [k for k in done_keys if k not in progress["seen_stamps"]]
    new_level = status["level"] if status["level"] > progress["seen_level"] else None
    new_items = [it for it in status["hat_items"]
                 if new_level and progress["seen_level"] < it["level"] <= status["level"]]
    if new_stamps or new_level or set(done_keys) != set(progress["seen_stamps"]):
        progress["seen_stamps"] = done_keys
        progress["seen_level"] = max(progress["seen_level"], status["level"])
        storage.save_progress(progress)
    return {"stamps": new_stamps, "level": new_level, "items": new_items}
