/* 모의 면접: 면접관 캐릭터가 질문하고, 내 답변에 핵심 키워드가 얼마나 들어갔는지 알려줘요. */
(function () {
  const root = document.getElementById("mock");
  if (!root || typeof QUESTIONS === "undefined") return;
  const $ = (id) => document.getElementById(id);
  const setup = $("mockSetup"), play = $("mockPlay"), endBox = $("mockEnd");
  const chars = {}; play.querySelectorAll(".char[data-who]").forEach((c) => (chars[c.dataset.who] = c));
  const TOTAL = 90;
  let qs = [], i = 0, left = TOTAL, timer = null, results = [], submitted = false;

  const norm = (s) => s.toLowerCase().replace(/[\s\/\-\.\,]/g, "");
  const inScope = (q, sc) => !sc || (sc === "common" ? q.scope === "common" : sc === "industry" ? INDUSTRY_IDS.includes(q.scope) : q.scope !== "common" && !INDUSTRY_IDS.includes(q.scope));
  const mood = (who, m) => Object.entries(chars).forEach(([k, c]) => (k === who && m ? c.setAttribute("data-mood", m) : c.removeAttribute("data-mood")));

  $("mockStart").addEventListener("click", () => {
    const pool = QUESTIONS.filter((q) => inScope(q, $("mockScope").value) && q.keywords && q.keywords.length);
    if (!pool.length) return toast("이 범위에는 질문이 없어요");
    qs = [...pool].sort(() => Math.random() - 0.5).slice(0, +$("mockCount").value);
    i = 0; results = []; setup.hidden = true; endBox.hidden = true; play.hidden = false; ask();
  });

  function tick() {
    left--; $("mockTime").textContent = String(Math.floor(left / 60)).padStart(2, "0") + ":" + String(left % 60).padStart(2, "0");
    $("mockBar").style.width = (left / TOTAL * 100) + "%";
    if (left <= 0) { clearInterval(timer); if (!submitted) { toast("시간 끝! 지금까지 쓴 답으로 제출해요"); submit(); } }
  }
  function ask() {
    const q = qs[i]; submitted = false; left = TOTAL; clearInterval(timer);
    $("mockQ").textContent = q.text; $("mockProg").textContent = `${i + 1} / ${qs.length} · ${SCOPE_NAMES[q.scope] || ""}`;
    $("mockAnswer").value = ""; $("mockAnswer").disabled = false; $("mockFb").hidden = true; $("mockNext").hidden = true;
    $("mockSubmit").hidden = false; $("mockSkip").hidden = false; $("mockTime").textContent = "01:30"; $("mockBar").style.width = "100%";
    mood(null); chars.pado && chars.pado.classList.add("talk");
    setTimeout(() => chars.pado && chars.pado.classList.remove("talk"), 1400);
    timer = setInterval(tick, 1000); $("mockAnswer").focus();
  }
  async function submit(skip) {
    if (submitted) return; submitted = true; clearInterval(timer);
    const q = qs[i], text = $("mockAnswer").value.trim();
    const n = norm(text);
    const hit = skip ? [] : q.keywords.filter((k) => n.includes(norm(k)));
    const miss = q.keywords.filter((k) => !hit.includes(k));
    const pct = Math.round(hit.length / q.keywords.length * 100);
    results.push({ q, pct, len: text.length, skipped: !!skip });
    $("mockAnswer").disabled = true; $("mockSubmit").hidden = true; $("mockSkip").hidden = true;
    const fb = $("mockFb"); fb.hidden = false;
    fb.className = "feedback " + (pct >= 60 ? "ok" : pct >= 30 ? "" : "bad");
    const lenNote = skip ? "" : text.length < 60 ? "답변이 조금 짧아요. 이유와 예시를 한 문장씩 더해 보세요." : text.length > 600 ? "조금 길어요. 핵심만 간추려 보세요." : "분량은 적당해요.";
    fb.innerHTML = `<b>${skip ? "건너뛰었어요" : `핵심 키워드 ${hit.length}/${q.keywords.length} (${pct}%)`}</b><div class="kw">` +
      hit.map((k) => `<span class="tag yellow">${k}</span>`).join("") + miss.map((k) => `<span class="tag white">${k}</span>`).join("") + `</div>` +
      (lenNote ? `<p style="margin:6px 0 0">${lenNote}</p>` : "") + `<p class="note" style="margin:6px 0 0">힌트: ${q.hint}</p>`;
    mood("bbiyak", skip ? "question" : pct >= 60 ? "sparkle" : pct >= 30 ? "question" : "sweat");
    if (pct >= 60) burst(innerWidth / 2, innerHeight / 2, 16);
    if (!skip && text) api("POST", "/api/answers", { question_id: q.id, text }).catch(() => {});
    $("mockNext").hidden = false; $("mockNext").textContent = i === qs.length - 1 ? "결과 보기" : "다음 질문";
  }
  $("mockSubmit").addEventListener("click", () => { if (!$("mockAnswer").value.trim()) return toast("답변을 먼저 써 주세요"); submit(); });
  $("mockSkip").addEventListener("click", () => submit(true));
  $("mockNext").addEventListener("click", () => { i++; i < qs.length ? ask() : finish(); });

  function finish() {
    clearInterval(timer); play.hidden = true; endBox.hidden = false;
    const done = results.filter((r) => !r.skipped), avg = done.length ? Math.round(done.reduce((a, r) => a + r.pct, 0) / done.length) : 0;
    const weak = [...done].sort((a, b) => a.pct - b.pct).slice(0, 2).filter((r) => r.pct < 60);
    endBox.innerHTML = `<h2>면접 끝!</h2><p>답변한 ${done.length}문제의 키워드 평균은 <b>${avg}%</b>예요.</p>
      ${weak.length ? `<p class="muted">더 연습하면 좋은 질문</p><ul>${weak.map((r) => `<li>${r.q.text} <span class="note">(${r.pct}%)</span></li>`).join("")}</ul>` : `<p class="muted">약한 질문 없이 잘 해냈어요!</p>`}
      <p class="note">답변은 저장됐어요. 일지와 경험치에 반영돼요.</p>
      <div class="row"><button class="btn" id="mockAgain" type="button">다시 하기</button><a class="btn white" href="/log">일지 보기</a></div>`;
    if (avg >= 60) burst(innerWidth / 2, innerHeight / 3, 30);
    endBox.querySelector("#mockAgain").addEventListener("click", () => { endBox.hidden = true; setup.hidden = false; });
  }
})();
