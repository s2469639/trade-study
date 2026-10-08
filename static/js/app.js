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
  toast._t = setTimeout(() => el.classList.remove("show"), 1600);
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

  function show(name) {
    buttons.forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
    root.querySelectorAll(":scope > .tab-panel").forEach((p) =>
      p.classList.toggle("active", p.dataset.panel === name)
    );
    const hash = new URLSearchParams(location.hash.slice(1));
    hash.set(key, name);
    history.replaceState(null, "", "#" + hash.toString());
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
  if (flash) { sessionStorage.removeItem("flash"); toast(flash); }
} catch (e) {}
