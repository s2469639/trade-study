/* 용어 퀴즈: 설명을 보고 용어를 맞혀요. 결과는 서버에 저장돼요 (맞히면 외운 용어, 틀리면 모르는 것). */
(function () {
  const btn = document.getElementById("termQuizBtn"), box = document.getElementById("termQuiz");
  if (!btn || typeof TERMS === "undefined") return;
  const shuffle = (a) => [...a].sort(() => Math.random() - 0.5);
  const mask = (t) => { let d = t.desc; [t.term, t.ko].forEach((w) => { if (w) d = d.split(w).join("○○"); }); return d; };
  let qs = [], i = 0, right = 0;

  function start() {
    qs = shuffle(TERMS).slice(0, 8); i = 0; right = 0;
    box.hidden = false; box.scrollIntoView({ behavior: "smooth", block: "center" }); ask();
  }
  function ask() {
    const t = qs[i];
    const same = shuffle(TERMS.filter((x) => x.id !== t.id && x.category === t.category));
    const others = same.concat(shuffle(TERMS.filter((x) => x.id !== t.id && x.category !== t.category))).slice(0, 3);
    const opts = shuffle([t, ...others]);
    box.innerHTML = `<div class="card-title-row"><span class="note">문제 ${i + 1} / ${qs.length}</span><span class="tag yellow">${t.category}</span></div>
      <h3 class="quiz-q">다음 설명에 알맞은 용어는?</h3><p class="quiz-desc"></p><div class="choices"></div><div class="feedback" hidden></div>
      <div class="dialog-foot"><span></span><button class="btn" id="tqNext" hidden type="button"></button></div>`;
    box.querySelector(".quiz-desc").textContent = mask(t);
    const wrap = box.querySelector(".choices"), fb = box.querySelector(".feedback"), nxt = box.querySelector("#tqNext");
    let locked = false;
    opts.forEach((o) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "choice"; b.textContent = `${o.term} · ${o.ko}`;
      b.addEventListener("click", () => {
        if (locked) return; locked = true;
        const ok = o.id === t.id; if (ok) right++;
        b.classList.add(ok ? "right" : "wrong");
        if (!ok) [...wrap.children].find((c) => c.textContent.startsWith(t.term + " ·")).classList.add("right");
        wrap.querySelectorAll(".choice").forEach((x) => (x.disabled = true));
        fb.hidden = false; fb.className = "feedback " + (ok ? "ok" : "bad");
        fb.textContent = (ok ? "정답! " : `아쉬워요. 정답은 ${t.term}(${t.ko}) 이에요. 복습 목록에 담아둘게요. `) + t.desc;
        if (ok) { const r = b.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, 10); }
        api("POST", `/api/term/${t.id}/quiz`, { correct: ok }).catch(() => {});
        nxt.hidden = false; nxt.textContent = i === qs.length - 1 ? "결과 보기" : "다음 문제";
      });
      wrap.appendChild(b);
    });
    nxt.addEventListener("click", () => { i++; i < qs.length ? ask() : done(); });
  }
  function done() {
    box.innerHTML = `<h2>${right >= qs.length * 0.75 ? "훌륭해요!" : "좋은 시작이에요"}</h2><p>${qs.length}문제 중 <b>${right}</b>문제를 맞혔어요.</p>
      <div class="row"><button class="btn" id="tqAgain" type="button">다시 풀기</button><button class="btn white" id="tqClose" type="button">닫고 용어집 보기</button></div>`;
    if (right >= qs.length * 0.75) burst(innerWidth / 2, innerHeight / 2, 30);
    box.querySelector("#tqAgain").addEventListener("click", start);
    box.querySelector("#tqClose").addEventListener("click", () => reloadWithToast("용어집을 새로 고쳤어요"));
  }
  btn.addEventListener("click", start);
})();
