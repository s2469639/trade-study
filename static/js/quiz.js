/* 섬 퀴즈: 3문제 중 2문제 이상 맞히면 '섬 퀴즈 통과' 스탬프! */
(function () {
  const root = document.getElementById("quiz");
  if (!root || typeof QUIZ === "undefined" || !QUIZ.length) return;
  const body = document.getElementById("quizBody");
  const score = document.getElementById("quizScore");
  const island = root.dataset.island;
  let q = 0, right = 0;

  function ask() {
    const item = QUIZ[q];
    body.innerHTML = `<p class="note">문제 ${q + 1} / ${QUIZ.length}</p><h3 class="quiz-q"></h3><div class="choices"></div><div class="feedback" hidden></div><div class="dialog-foot"><span></span><button class="btn" id="qNext" hidden type="button">다음</button></div>`;
    body.querySelector(".quiz-q").textContent = item.q;
    const wrap = body.querySelector(".choices"), fb = body.querySelector(".feedback"), nxt = body.querySelector("#qNext");
    let locked = false;
    item.options.forEach((text, idx) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "choice"; b.textContent = text;
      b.addEventListener("click", () => {
        if (locked) return; locked = true;
        const ok = idx === item.answer;
        if (ok) right++;
        b.classList.add(ok ? "right" : "wrong");
        if (!ok) wrap.children[item.answer].classList.add("right");
        wrap.querySelectorAll(".choice").forEach((x) => (x.disabled = true));
        fb.hidden = false; fb.className = "feedback " + (ok ? "ok" : "bad");
        fb.textContent = (ok ? "정답! " : "아쉬워요. ") + item.explain;
        if (ok) { const r = b.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, 12); }
        nxt.hidden = false; nxt.textContent = q === QUIZ.length - 1 ? "결과 보기" : "다음";
      });
      wrap.appendChild(b);
    });
    nxt.addEventListener("click", () => { q++; q < QUIZ.length ? ask() : result(); });
  }

  async function result() {
    const pass = right >= 2;
    body.innerHTML = `<h2>${pass ? "통과!" : "아쉬워요"}</h2><p>${QUIZ.length}문제 중 <b>${right}</b>문제를 맞혔어요.</p><div class="row"><button class="btn" id="qRetry" type="button">다시 풀기</button></div>`;
    body.querySelector("#qRetry").addEventListener("click", () => { q = 0; right = 0; ask(); });
    if (pass) {
      burst(innerWidth / 2, innerHeight / 2, 28);
      if (root.dataset.passed !== "1") {
        try { await api("POST", "/api/progress/quiz", { id: island, passed: true }); } catch (e) {}
        reloadWithToast("스탬프를 받았어요");
      }
    }
  }
  ask();
})();
