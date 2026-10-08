/* 공통 JS - 모든 페이지에서 실행됨.
   HTML에 data-* 속성만 달면 동작하도록 만들어서, 페이지마다 JS를 새로 짤 필요가 없다.

   [data-tabs] / [data-tab]        탭 전환
   <form data-collection="news">   폼 저장 (POST /api/news)
   [data-del="news/abc123"]        삭제
   [data-toggle="todos/abc123"]    체크박스 → done 값 저장
   [data-term="fob"]               무역 용어 외웠어요 토글
   .filter-bar[data-target="#id"]  칩 필터 / input.search[data-target] 검색
*/

// ---------- 도우미 ----------
function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 1800);
}

// 🎉 톡 터지는 색종이 (x, y 는 화면 좌표)
function burst(x, y, count = 16) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const colors = ["#FFD43B", "#4DABF7", "#2F7FD1", "#FFF1B8", "#D9EDFD"];
  for (let i = 0; i < count; i++) {
    const p = document.createElement("span");
    p.className = "confetti";
    p.style.left = x + "px";
    p.style.top = y + "px";
    p.style.background = colors[i % colors.length];
    document.body.appendChild(p);
    const angle = Math.random() * Math.PI * 2, dist = 50 + Math.random() * 90;
    p.animate(
      [
        { transform: "translate(0,0) rotate(0) scale(1)", opacity: 1 },
        { transform: `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist - 30}px) rotate(${Math.random() * 540}deg) scale(1)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${Math.cos(angle) * dist * 1.1}px, ${Math.sin(angle) * dist + 70}px) rotate(${Math.random() * 720}deg) scale(.4)`, opacity: 0 },
      ],
      { duration: 900 + Math.random() * 400, easing: "cubic-bezier(.2,.7,.3,1)" }
    ).onfinish = () => p.remove();
  }
}
function burstAt(el) {
  const r = el.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2);
}

async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error("요청 실패: " + res.status);
  return res.json();
}

// 저장 후 새로고침해도 보던 탭이 유지되도록 flash 메시지를 잠깐 저장
function reloadWithToast(msg) {
  try { sessionStorage.setItem("flash", msg); } catch (e) {}
  location.reload();
}

// ---------- 탭 ----------
document.querySelectorAll("[data-tabs]").forEach((group) => {
  const key = group.dataset.tabs || "tab";
  const buttons = group.querySelectorAll(".tab");
  const root = group.parentElement;

  // 탭 뒤에서 미끄러지듯 움직이는 하얀 알약
  const indicator = document.createElement("span");
  indicator.className = "tab-indicator";
  group.prepend(indicator);
  function moveIndicator() {
    const active = group.querySelector(".tab.active");
    if (!active) return;
    indicator.style.left = active.offsetLeft + "px";
    indicator.style.top = active.offsetTop + "px";
    indicator.style.width = active.offsetWidth + "px";
    indicator.style.height = active.offsetHeight + "px";
  }
  window.addEventListener("resize", moveIndicator);

  function show(name) {
    buttons.forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
    root.querySelectorAll(":scope > .tab-panel").forEach((p) =>
      p.classList.toggle("active", p.dataset.panel === name)
    );
    const hash = new URLSearchParams(location.hash.slice(1));
    hash.set(key, name);
    history.replaceState(null, "", "#" + hash.toString());
    moveIndicator();
    root.dispatchEvent(new CustomEvent("tabshown", { detail: name }));
  }

  buttons.forEach((b) => b.addEventListener("click", () => show(b.dataset.tab)));
  const fromHash = new URLSearchParams(location.hash.slice(1)).get(key);
  const first = buttons[0] && buttons[0].dataset.tab;
  show([...buttons].some((b) => b.dataset.tab === fromHash) ? fromHash : first);
});

// ---------- 폼 저장 ----------
document.querySelectorAll("form[data-collection]").forEach((form) => {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = {};
    new FormData(form).forEach((v, k) => { data[k] = typeof v === "string" ? v.trim() : v; });
    if (form.dataset.extra) Object.assign(data, JSON.parse(form.dataset.extra));

    // 뉴스 폼의 '모르는 용어' 칸 → 모르는 것 목록에도 같이 저장
    const unknown = data._unknown;
    delete data._unknown;

    try {
      await api("POST", "/api/" + form.dataset.collection, data);
      if (unknown) await api("POST", "/api/unknowns", { text: unknown, source: data.title || "" });
      reloadWithToast("저장했어요 ✏️");
    } catch (err) {
      toast("저장 실패 😢 서버가 켜져 있나요?");
    }
  });
});

// ---------- 삭제 / 체크 / 용어 토글 (이벤트 위임) ----------
document.addEventListener("click", async (e) => {
  const del = e.target.closest("[data-del]");
  if (del) {
    if (!confirm("정말 지울까요?")) return;
    const [col, id] = del.dataset.del.split("/");
    try { await api("DELETE", `/api/${col}/${id}`); reloadWithToast("지웠어요 🗑️"); }
    catch (err) { toast("삭제 실패 😢"); }
    return;
  }

  const term = e.target.closest("[data-term]");
  if (term) {
    try {
      const r = await api("POST", `/api/term/${term.dataset.term}/toggle`);
      const card = term.closest(".term");
      card.classList.toggle("known", r.known);
      term.textContent = r.known ? "✅ 외웠어요!" : "☐ 아직 헷갈려요";
      if (r.known) burstAt(term);
      const counter = document.getElementById("known-count");
      if (counter) counter.textContent = document.querySelectorAll(".term.known").length;
    } catch (err) { toast("저장 실패 😢"); }
  }
});

document.addEventListener("change", async (e) => {
  const t = e.target.closest("[data-toggle]");
  if (!t) return;
  const [col, id] = t.dataset.toggle.split("/");
  try {
    await api("PATCH", `/api/${col}/${id}`, { done: t.checked });
    t.closest(".item").classList.toggle("done", t.checked);
    if (t.checked) burstAt(t);
  } catch (err) { toast("저장 실패 😢"); t.checked = !t.checked; }
});

// ---------- 필터 / 검색 ----------
function applyFilters(targetSel) {
  const target = document.querySelector(targetSel);
  if (!target) return;
  const active = {};
  document.querySelectorAll(`.filter-bar[data-target="${targetSel}"] .chip.active`).forEach((c) => {
    if (c.dataset.value) active[c.dataset.key] = c.dataset.value;
  });
  const q = (document.querySelector(`input.search[data-target="${targetSel}"]`) || {}).value || "";
  target.querySelectorAll(":scope > .filterable").forEach((item) => {
    let ok = Object.entries(active).every(([k, v]) => (item.dataset[k] || "") === v);
    if (ok && q) ok = item.textContent.toLowerCase().includes(q.toLowerCase());
    item.classList.toggle("hidden", !ok);
  });
}
document.querySelectorAll(".filter-bar[data-target]").forEach((bar) => {
  bar.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    bar.querySelectorAll(`.chip[data-key="${chip.dataset.key}"]`).forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    applyFilters(bar.dataset.target);
  });
});
document.querySelectorAll("input.search[data-target]").forEach((input) => {
  input.addEventListener("input", () => applyFilters(input.dataset.target));
});

// ---------- 글자수 세기 ----------
document.querySelectorAll("textarea[data-counter]").forEach((ta) => {
  const out = document.querySelector(ta.dataset.counter);
  const update = () => { out.textContent = ta.value.length.toLocaleString() + "자"; };
  ta.addEventListener("input", update);
  update();
});

// ---------- 저장 후 토스트 보여주기 ----------
try {
  const flash = sessionStorage.getItem("flash");
  if (flash) {
    sessionStorage.removeItem("flash");
    toast(flash);
    if (flash.includes("저장")) burst(innerWidth / 2, innerHeight - 40, 20);
  }
} catch (e) {}

// ---------- 스르륵 등장 (화면에 보일 때 하나씩) ----------
(function () {
  const sel = ".page-head, .hero, .card, .item, .pick, .term, .process-step, .steps li, .empty, .chip";
  const io = "IntersectionObserver" in window ? new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add("in");
      io.unobserve(en.target);
    });
  }, { threshold: 0.06, rootMargin: "0px 0px -30px 0px" }) : null;

  document.querySelectorAll(sel).forEach((el) => {
    if (el.closest(".sidebar") || el.closest(".tab-indicator")) return;
    // 같은 부모 안에서 몇 번째인지에 따라 살짝 늦게 등장 (최대 8단계)
    const idx = [...el.parentElement.children].indexOf(el);
    el.style.setProperty("--i", Math.min(idx, 8));
    el.classList.add("reveal");
    io ? io.observe(el) : el.classList.add("in");
  });
  // 탭 패널의 직접 자식에도 순서 지정 (탭 전환 때 올라오는 애니메이션용)
  document.querySelectorAll(".tab-panel").forEach((p) =>
    [...p.children].forEach((c, i) => c.style.setProperty("--i", Math.min(i, 8)))
  );
})();

// ---------- 숫자 카운트업 ----------
document.querySelectorAll("[data-count]").forEach((el) => {
  const end = parseInt(el.dataset.count, 10) || 0;
  if (!end || matchMedia("(prefers-reduced-motion: reduce)").matches) { el.textContent = end; return; }
  const t0 = performance.now(), dur = 900;
  (function tick(now) {
    const k = Math.min((now - t0) / dur, 1);
    el.textContent = Math.round(end * (1 - Math.pow(1 - k, 3)));
    if (k < 1) requestAnimationFrame(tick);
  })(t0);
});

// ---------- 캐릭터: 누르면 폴짝 + 말풍선, 눈동자는 마우스를 따라감 ----------
(function () {
  const lines = ["오늘도 한 줄!", "화이팅 ✊", "FOB 기억나?", "수출은 타이밍!", "뉴스 하나만 더", "L/C 외웠어?", "잘하고 있어 :)", "면접 가보자!"];
  document.querySelectorAll(".scene .char").forEach((c) => {
    c.addEventListener("click", () => {
      c.classList.remove("hop"); void c.getBoundingClientRect(); c.classList.add("hop");
      const r = c.getBoundingClientRect();
      const b = document.createElement("div");
      b.className = "speech";
      b.textContent = lines[Math.floor(Math.random() * lines.length)];
      b.style.left = r.left + r.width / 2 + scrollX + "px";
      b.style.top = r.top + scrollY - 34 + "px";
      document.body.appendChild(b);
      setTimeout(() => b.remove(), 1700);
      burst(r.left + r.width / 2, r.top + 20, 10);
    });
    c.addEventListener("animationend", () => c.classList.remove("hop"));
  });

  const wraps = document.querySelectorAll(".scene .eyes-wrap");
  if (!wraps.length || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  let raf = null, mx = 0, my = 0;
  addEventListener("mousemove", (e) => {
    mx = e.clientX; my = e.clientY;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = null;
      wraps.forEach((w) => {
        const r = w.getBoundingClientRect();
        const dx = mx - (r.left + r.width / 2), dy = my - (r.top + r.height / 2);
        const d = Math.hypot(dx, dy) || 1, k = Math.min(d / 120, 1) * 4;
        w.style.transform = `translate(${(dx / d) * k}px, ${(dy / d) * k}px)`;
      });
    });
  });
})();

// 폰트가 늦게 불러와져 글자 폭이 달라지면 탭 박스 위치를 다시 맞춘다
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => dispatchEvent(new Event("resize")));
addEventListener("load", () => dispatchEvent(new Event("resize")));
