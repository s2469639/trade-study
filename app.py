"""무역 공부 웹페이지 - Flask 서버.

실행:  python app.py   →  http://127.0.0.1:5000
"""
import io
import json
import re
from datetime import date, datetime

from flask import Flask, jsonify, render_template, request, send_file, redirect, url_for

import storage

app = Flask(__name__)

# 사이드바 메뉴: (함수이름, 이모지, 이름)
NAV = [
    ("home", "🏠", "홈"),
    ("industry", "🏭", "산업 공부"),
    ("company", "🏢", "기업 공부"),
    ("trade", "🚢", "무역 공부"),
    ("news", "📰", "뉴스 & 시사"),
    ("writing", "✍️", "글쓰기"),
    ("interview", "🎤", "해외영업 연결"),
    ("log", "📒", "나의 기록"),
]


@app.context_processor
def inject_globals():
    return {
        "NAV": NAV,
        "today": date.today().strftime("%Y-%m-%d"),
        "industries_all": storage.load_sample("industries"),
    }


# ---------------------------------------------------------------- 도우미
def newest_first(items):
    return sorted(items, key=lambda x: x.get("created", ""), reverse=True)


def split_lines(text):
    """'a, b\\nc' → ['a', 'b', 'c']  (직접 입력한 기업 정보를 목록으로 바꿈)"""
    if isinstance(text, list):
        return text
    return [p.strip() for p in re.split(r"[\n,]", text or "") if p.strip()]


def all_companies():
    """샘플 기업 + 내가 추가한 기업을 같은 모양으로 합치기."""
    result = []
    for c in storage.load_sample("companies"):
        c = dict(c)
        c["mine"] = False
        result.append(c)
    for u in storage.read_all("my_companies"):
        result.append({
            "id": "u_" + u["id"],
            "raw_id": u["id"],
            "mine": True,
            "name": u.get("name", "(이름 없음)"),
            "industry": u.get("industry", ""),
            "summary": u.get("summary", ""),
            "segments": [{"name": s, "desc": ""} for s in split_lines(u.get("segments"))],
            "products": split_lines(u.get("products")),
            "overseas": split_lines(u.get("overseas")),
            "markets": split_lines(u.get("markets")),
            "competitors": split_lines(u.get("competitors")),
            "issues": split_lines(u.get("issues")),
            "sales_view": u.get("sales_view", ""),
        })
    return result


def name_lookup():
    """id → 이름 (기록 화면에서 '삼성전자' 처럼 보여주기 위해)"""
    names = {i["id"]: i["name"] for i in storage.load_sample("industries")}
    names.update({c["id"]: c["name"] for c in all_companies()})
    names["trade"] = "무역"
    return names


# ---------------------------------------------------------------- 화면
@app.route("/")
def home():
    terms = storage.load_sample("trade")["terms"]
    term_of_day = terms[date.today().toordinal() % len(terms)]
    todos = newest_first(storage.read_all("todos"))
    unknowns = [u for u in newest_first(storage.read_all("unknowns")) if not u.get("done")]
    stats = {
        "logs": len(storage.read_all("logs")),
        "news": len(storage.read_all("news")),
        "writings": len(storage.read_all("writings")),
        "terms": len(storage.read_all("known_terms")),
        "terms_total": len(terms),
    }
    hour = datetime.now().hour
    greeting = ("좋은 아침이에요 ☀️" if 5 <= hour < 12 else "점심 먹고 한 페이지 📖" if 12 <= hour < 18
                else "오늘 하루도 수고했어요 🌙" if 18 <= hour < 24 else "늦은 밤, 한 줄만 더 🦉")
    days = set()
    for col in ("logs", "news", "writings", "notes", "explains", "answers"):
        days.update(i.get("date") for i in storage.read_all(col) if i.get("date"))
    return render_template(
        "home.html",
        greeting=greeting,
        study_days=len(days),
        term_of_day=term_of_day,
        todos=todos,
        unknowns=unknowns[:6],
        recent_logs=newest_first(storage.read_all("logs"))[:5],
        stats=stats,
    )


@app.route("/industry")
def industry():
    industries = storage.load_sample("industries")
    selected_id = request.args.get("id", industries[0]["id"])
    selected = next((i for i in industries if i["id"] == selected_id), industries[0])
    companies = [c for c in all_companies() if c["industry"] == selected["id"]]
    notes = newest_first([n for n in storage.read_all("notes")
                          if n.get("target_type") == "industry" and n.get("target_id") == selected["id"]])
    news = newest_first([n for n in storage.read_all("news") if n.get("industry") == selected["id"]])
    return render_template("industry.html", industries=industries, ind=selected,
                           companies=companies, notes=notes, news=news)


@app.route("/company")
def company():
    companies = all_companies()
    selected_id = request.args.get("id", companies[0]["id"])
    selected = next((c for c in companies if c["id"] == selected_id), companies[0])
    notes = newest_first([n for n in storage.read_all("notes")
                          if n.get("target_type") == "company" and n.get("target_id") == selected["id"]])
    jobs = newest_first([j for j in storage.read_all("jobs") if j.get("company_id") == selected["id"]])
    news = newest_first([n for n in storage.read_all("news") if n.get("company_id") == selected["id"]])
    return render_template("company.html", companies=companies, co=selected,
                           notes=notes, jobs=jobs, news=news)


@app.route("/trade")
def trade():
    data = storage.load_sample("trade")
    known = {k["term_id"] for k in storage.read_all("known_terms")}
    notes = newest_first([n for n in storage.read_all("notes") if n.get("target_type") == "trade"])
    return render_template("trade.html", t=data, known=known, notes=notes)


@app.route("/news")
def news():
    return render_template("news.html", items=newest_first(storage.read_all("news")),
                           companies=all_companies())


@app.route("/writing")
def writing():
    items = newest_first(storage.read_all("writings"))
    return render_template(
        "writing.html",
        w=storage.load_sample("writing"),
        editorials=[x for x in items if x.get("kind") == "editorial"],
        mine=[x for x in items if x.get("kind") == "mine"],
        phrases=newest_first(storage.read_all("phrases")),
    )


@app.route("/interview")
def interview():
    questions = storage.load_sample("interview")
    answers = {}
    for a in newest_first(storage.read_all("answers")):
        answers.setdefault(a["question_id"], []).append(a)
    companies = all_companies()
    scope_names = {"common": "공통"}
    scope_names.update({i["id"]: i["name"] for i in storage.load_sample("industries")})
    scope_names.update({c["id"]: c["name"] for c in companies})
    return render_template(
        "interview.html",
        questions=questions,
        answers=answers,
        companies=companies,
        scope_names=scope_names,
        explains=newest_first(storage.read_all("explains")),
    )


@app.route("/log")
def log():
    names = name_lookup()
    timeline = []
    for col, label in [("logs", "공부"), ("news", "뉴스"), ("writings", "글"),
                       ("notes", "메모"), ("explains", "설명"), ("answers", "면접답변")]:
        for it in storage.read_all(col):
            if col == "logs":
                title, text = it.get("text", ""), ""
            elif col == "news":
                title, text = it.get("title", ""), it.get("summary", "")
            elif col == "writings":
                title = it.get("title", "")
                text = it.get("body") or it.get("my_opinion") or it.get("claim", "")
            elif col == "notes":
                title = "[" + names.get(it.get("target_id"), "무역") + "] 메모"
                text = it.get("text", "")
            elif col == "explains":
                title, text = it.get("topic", ""), it.get("text", "")
            else:
                title, text = "면접 답변 연습", it.get("text", "")
            timeline.append({"col": col, "label": label, "id": it["id"], "date": it.get("date", ""),
                             "created": it.get("created", ""), "title": title, "text": text,
                             "tag": it.get("tag", "")})
    notes = newest_first(storage.read_all("notes"))
    for n in notes:
        n["target_name"] = names.get(n.get("target_id"), "무역")
    return render_template(
        "log.html",
        timeline=newest_first(timeline),
        logs=newest_first(storage.read_all("logs")),
        notes_industry=[n for n in notes if n.get("target_type") == "industry"],
        notes_company=[n for n in notes if n.get("target_type") == "company"],
        notes_trade=[n for n in notes if n.get("target_type") == "trade"],
        news=newest_first(storage.read_all("news")),
        writings=newest_first(storage.read_all("writings")),
        unknowns=newest_first(storage.read_all("unknowns")),
        names=names,
    )


# ---------------------------------------------------------------- 저장 API
# 화면(JS)이 기록을 저장/수정/삭제할 때 부르는 주소들
def _check(col):
    if col not in storage.COLLECTIONS:
        return jsonify(error="unknown collection"), 404
    return None


@app.post("/api/<col>")
def api_add(col):
    err = _check(col)
    if err:
        return err
    data = request.get_json(silent=True) or {}
    return jsonify(storage.add(col, data))


@app.patch("/api/<col>/<item_id>")
def api_update(col, item_id):
    err = _check(col)
    if err:
        return err
    item = storage.update(col, item_id, request.get_json(silent=True) or {})
    return (jsonify(item), 200) if item else (jsonify(error="not found"), 404)


@app.delete("/api/<col>/<item_id>")
def api_delete(col, item_id):
    err = _check(col)
    if err:
        return err
    return jsonify(ok=storage.delete(col, item_id))


@app.post("/api/term/<term_id>/toggle")
def api_term_toggle(term_id):
    """무역 용어 '외웠어요' 표시 켜기/끄기"""
    known = storage.read_all("known_terms")
    found = next((k for k in known if k["term_id"] == term_id), None)
    if found:
        storage.delete("known_terms", found["id"])
        return jsonify(known=False)
    storage.add("known_terms", {"term_id": term_id})
    return jsonify(known=True)


# ---------------------------------------------------------------- 백업
@app.get("/export")
def export_data():
    payload = json.dumps(storage.export_all(), ensure_ascii=False, indent=2).encode("utf-8")
    name = f"trade_study_backup_{datetime.now():%Y%m%d}.json"
    return send_file(io.BytesIO(payload), mimetype="application/json",
                     as_attachment=True, download_name=name)


@app.post("/import")
def import_data():
    f = request.files.get("file")
    try:
        data = json.load(f)
        storage.import_all(data)
    except Exception:
        pass
    return redirect(url_for("log"))


if __name__ == "__main__":
    app.run(debug=True)
