/* 스토리 플레이어: data/story.json 의 챕터를 한 장면씩 보여줘요.
   장면 종류: say(대사) / choice(선택지). 고르면 바로 해설이 나오고, 틀리면 다시 고를 수 있어요. */
(function () {
  const scenes = CHAPTER.scenes;
  const $ = (id) => document.getElementById(id);
  const who = $("who"), line = $("line"), choices = $("choices"), fb = $("feedback");
  const nextBtn = $("nextBtn"), prog = $("progressText");
  const chars = {};
  document.querySelectorAll(".stage .char[data-who]").forEach((c) => (chars[c.dataset.who] = c));

  let i = 0, mistakes = 0, typer = null, typing = false, fullText = "", answered = false;

  function setMoods(moods) {
    Object.values(chars).forEach((c) => c.removeAttribute("data-mood"));
    Object.entries(moods || {}).forEach(([k, v]) => chars[k] && chars[k].setAttribute("data-mood", v));
  }
  function speaker(key) {
    Object.entries(chars).forEach(([k, c]) => c.classList.toggle("talk", k === key));
    who.textContent = NAMES[key] || "";
    who.style.setProperty("--tag", HATS[key] || "#fff");
  }
  function typeOut(text, done) {
    clearInterval(typer); typing = true; fullText = text; line.textContent = ""; let n = 0;
    typer = setInterval(() => {
      n += 2; line.textContent = text.slice(0, n);
      if (n >= text.length) { clearInterval(typer); typing = false; done && done(); }
    }, 22);
  }
  function skipTyping() { clearInterval(typer); typing = false; line.textContent = fullText; }

  function show() {
    const sc = scenes[i];
    prog.textContent = `${i + 1} / ${scenes.length}`;
    choices.innerHTML = ""; fb.hidden = true; fb.className = "feedback"; answered = false;
    setMoods(sc.mood);
    speaker(sc.who);
    if (sc.t === "say") {
      nextBtn.hidden = false; nextBtn.textContent = i === scenes.length - 1 ? "마무리" : "다음";
      typeOut(sc.text);
    } else {
      nextBtn.hidden = true;
      typeOut(sc.prompt, () => {
        // 보기 순서를 섞어서 정답 위치를 외우지 않게 해요
        [...sc.options].sort(() => Math.random() - 0.5).forEach((o) => {
          const b = document.createElement("button");
          b.type = "button"; b.className = "choice"; b.textContent = o.text;
          b.addEventListener("click", () => pick(o, b));
          choices.appendChild(b);
        });
      });
    }
  }

  function pick(o, btn) {
    if (answered) return;
    fb.hidden = false; fb.textContent = o.fb;
    if (o.ok) {
      answered = true; btn.classList.add("right"); fb.className = "feedback ok";
      choices.querySelectorAll(".choice").forEach((b) => (b.disabled = true));
      setMoods({ bbiyak: "sparkle" });
      const r = btn.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, 14);
      nextBtn.hidden = false; nextBtn.textContent = "다음";
    } else {
      mistakes++; btn.classList.add("wrong"); btn.disabled = true; fb.className = "feedback bad";
      setMoods({ bbiyak: "sweat" });
    }
  }

  function finish() {
    const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
    document.querySelector(".stage-card").hidden = true;
    const end = $("endCard"); end.hidden = false;
    $("endStars").innerHTML = [0, 1, 2].map((n) => `<svg class="ico star ${n < stars ? "" : "empty"}"><use href="#i-star"/></svg>`).join("");
    $("endSummary").innerHTML = CHAPTER.summary.map((s) => `<li>${s}</li>`).join("");
    api("POST", "/api/progress/chapter", { id: CHAPTER.id, stars }).catch(() => {});
    burst(innerWidth / 2, innerHeight / 3, 30);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  nextBtn.addEventListener("click", () => {
    if (typing) return skipTyping();
    if (i >= scenes.length - 1) return finish();
    i++; show();
  });
  line.addEventListener("click", () => typing && skipTyping());
  show();
})();
