// 페이지 맨 위 장면: 졸라맨 둘이 그 페이지에 맞는 "일"을 하는 짧은 이야기를 반복해요.
// 소품을 누르면 처음부터 다시 보여줘요.
(function () {
  const svg = document.querySelector("svg.scene");
  if (!svg) return;
  const NS = "http://www.w3.org/2000/svg";
  const pl = svg.querySelector(".actor.pl"), me = svg.querySelector(".actor.me");
  const prop = svg.querySelector(".prop-wrap"), move = svg.querySelector(".prop-move");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const page = svg.dataset.page;
  const HAND = { pl: [112, 126], me: [508, 126] };
  let tok = 0, running = false;
  const pos = new Map(), live = new Set(), temp = new Set();

  const cancel = () => { throw new Error("cancel"); };
  const sleep = (ms, my) => new Promise((ok) => setTimeout(() => (my === tok ? ok() : cancel()), ms));

  function S(my) {
    const who = { pl, me };
    const w = (ms) => sleep(ms, my);
    const anim = (el, frames, opt) => { const a = el.animate(frames, Object.assign({ fill: "forwards" }, opt)); live.add(a); return a.finished.then(() => { if (my !== tok) cancel(); }); };
    const mv = (el, x, y = 0, ms = 1500) => {
      if (typeof el === "string") el = who[el];
      const c = pos.get(el) || [0, 0]; pos.set(el, [x, y]);
      return anim(el, [{ transform: `translate(${c[0]}px,${c[1]}px)` }, { transform: `translate(${x}px,${y}px)` }], { duration: ms, easing: "ease-in-out" });
    };
    const item = (kind, x, y, parent = svg) => {
      const g = document.createElementNS(NS, "g");
      g.setAttribute("transform", `translate(${x},${y})`);
      const shape = {
        crate: '<path class="pf y" d="M-10 -10 h20 v20 h-20 z M-10 0 h20"/>',
        paper: '<path class="pf w" d="M-9 -12 h18 v24 h-18 z M-5 -5 h10 M-5 1 h10 M-5 7 h6"/>',
        book: '<path class="pf b" d="M-11 -9 h22 v18 h-22 z M-5 -9 v18"/>',
        pencil: '<path class="stroke" style="stroke-width:3.4" d="M-8 8 L8 -8"/><path class="pf y" d="M8 -8 l3 -3" />',
      }[kind];
      g.innerHTML = shape; parent.appendChild(g); temp.add(g); g._p = [x, y]; return g;
    };
    const to = (g, x, y, ms = 900, arc = 0) => {
      const c = g._p; g._p = [x, y];
      const mid = `translate(${(c[0] + x) / 2}px,${(c[1] + y) / 2 - arc}px)`;
      const fr = [{ transform: `translate(${c[0]}px,${c[1]}px)` }, ...(arc ? [{ transform: mid }] : []), { transform: `translate(${x}px,${y}px)` }];
      return anim(g, fr, { duration: ms, easing: "ease-in-out" });
    };
    const give = (g, name) => { const a = who[name], o = pos.get(a) || [0, 0], h = HAND[name]; a.appendChild(g); g.style.transform = ""; g.setAttribute("transform", `translate(${h[0]},${h[1]})`); g.getAnimations().forEach((x) => x.cancel()); g._p = h; };
    const drop = (g) => { g.animate([{ transform: "scale(1)" }, { transform: "scale(0)" }], { duration: 300, fill: "forwards" }); const r = g.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, 8); };
    const say = (name, text, ms = 1500) => {
      const el = who[name].querySelector(".char"), r = el.getBoundingClientRect();
      el.classList.remove("hop"); void el.getBoundingClientRect(); el.classList.add("hop");
      const b = document.createElement("div");
      b.className = "speech" + (name === "me" ? " alt" : "");
      b.textContent = text;
      b.style.left = r.left + r.width / 2 + scrollX + "px";
      b.style.top = r.top + scrollY - 34 + "px";
      document.body.appendChild(b); setTimeout(() => b.remove(), 1900);
      return w(ms);
    };
    const draw = (sel, ms = 1600) => Promise.all([...svg.querySelectorAll(sel)].map((e) => anim(e, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: ms, easing: "ease-in-out" })));
    const par = Promise.all.bind(Promise);
    return { w, mv, item, to, give, drop, say, draw, par, anim, pl, me, prop: move };
  }

  const stories = {
    "산업섬": async (s) => {
      await s.say("me", "주문이 들어왔다!");
      const crate = s.item("crate", 276, 172);
      await s.par([s.mv("pl", 96, 0, 1700), s.to(crate, 208, 172, 1700)]);
      s.give(crate, "pl"); await s.say("pl", "상자 받았어요!", 900);
      await s.mv("pl", 0, 0, 1700);
      await s.say("pl", "포장하고 선적 준비!", 1200); s.drop(crate); await s.w(600);
    },
    "기업항구": async (s) => {
      await s.say("me", "이 회사부터 조사해 봐");
      const note = s.item("paper", 0, 0, s.pl); s.give(note, "pl");
      await s.mv("pl", 112, 0, 1700);
      await s.say("pl", "주력 제품이 뭐지?", 1000);
      const hook = svg.querySelector(".hook");
      await s.anim(hook, [{ transform: "translateY(0)" }, { transform: "translateY(70px)" }, { transform: "translateY(0)" }], { duration: 2200, easing: "ease-in-out" });
      await s.say("pl", "컨테이너로 수출하네!", 1200);
      await s.mv("pl", 0, 0, 1700);
      await s.say("me", "메모 잊지 마", 800);
    },
    "무역학원": async (s) => {
      await s.say("me", "오늘 수업은 FOB!");
      const bk = s.item("book", 0, 0, s.pl); s.give(bk, "pl");
      await s.mv("me", -112, 0, 1600);
      await s.par([s.draw(".chalk-draw", 1800), s.say("me", "선적항까지가 판매자 몫", 1800)]);
      await s.say("pl", "필기 완료!", 900);
      await s.mv("me", 0, 0, 1500);
    },
    "신문사": async (s) => {
      const paper = s.item("paper", 0, 0, s.me); s.give(paper, "me");
      await s.say("me", "오늘 기사 가져왔어", 900);
      await s.par([s.mv("me", -80, 0, 1400), s.mv("pl", 80, 0, 1400)]);
      svg.appendChild(paper); paper.setAttribute("transform", "translate(0,0)"); paper._p = [428, 126];
      paper.getAnimations().forEach((a) => a.cancel());
      await s.to(paper, 172 + 22, 126, 900, 40);
      s.give(paper, "pl");
      await s.say("pl", "환율 기사네요!", 1200);
      await s.par([s.mv("me", 0, 0, 1400), s.mv("pl", 0, 0, 1400)]);
      s.drop(paper);
    },
    "글쓰기도서관": async (s) => {
      await s.say("me", "초안부터 써 봐");
      const pen = s.item("pencil", 0, 0, s.pl); s.give(pen, "pl");
      await s.mv("pl", 38, 0, 1200);
      await s.par([s.draw(".scribble", 2000), s.say("pl", "쓱쓱...", 2000)]);
      await s.say("pl", "첫 문장 완성!", 900);
      await s.say("me", "좋아, 고치는 건 나중에", 1200);
      await s.mv("pl", 0, 0, 1200);
    },
    "면접회관": async (s) => {
      await s.par([s.mv("pl", 100, 0, 1500), s.mv("me", -100, 0, 1500)]);
      await s.say("me", "1분 자기소개 해볼까?");
      await s.say("pl", "해외영업 지원한 삐약입니다!");
      await s.say("me", "왜 우리 회사야?");
      await s.say("pl", "수출 비중이 커서요!");
      await s.par([s.mv("pl", 0, 0, 1400), s.mv("me", 0, 0, 1400)]);
    },
    "나의일지": async (s) => {
      const pen = s.item("pencil", 0, 0, s.pl); s.give(pen, "pl");
      await s.mv("pl", 116, 0, 1600);
      await s.par([s.draw(".penrun .stroke", 2400), s.say("pl", "오늘 한 줄 기록!", 2400)]);
      await s.mv("pl", 0, 0, 1500);
      await s.say("me", "꾸준히가 제일이야", 1000);
    },
    "무역항구": async (s) => {
      await s.say("me", "출항 준비 됐어?");
      await s.mv("pl", 190, -38, 1800);
      await s.say("pl", "출항!", 700);
      await s.par([s.mv("pl", 250, -38, 2000), s.anim(s.prop, [{ transform: "translateX(0)" }, { transform: "translateX(60px)" }], { duration: 2000, easing: "ease-in-out" })]);
      await s.say("me", "잘 다녀와!", 900);
      await s.par([s.mv("pl", 190, -38, 1800), s.anim(s.prop, [{ transform: "translateX(60px)" }, { transform: "translateX(0)" }], { duration: 1800, easing: "ease-in-out" })]);
      await s.mv("pl", 0, 0, 1600);
    },
  };

  function reset() {
    live.forEach((a) => { try { a.cancel(); } catch (e) {} }); live.clear();
    temp.forEach((g) => g.remove()); temp.clear();
    pos.clear();
    document.querySelectorAll(".speech").forEach((b) => b.remove());
  }

  async function run() {
    const story = stories[page];
    if (!story || running) return;
    running = true;
    const my = ++tok;
    try { reset(); await story(S(my)); await sleep(3500, my); } catch (e) { if (e.message !== "cancel") console.error(e); }
    running = false;
    if (my === tok && !reduce) loop();
  }
  function loop() { if (document.hidden) { addEventListener("visibilitychange", loop, { once: true }); return; } run(); }

  if (prop) prop.addEventListener("click", () => { tok++; running = false; reset(); setTimeout(run, 50); });
  if (!reduce) setTimeout(loop, 1200);
})();
