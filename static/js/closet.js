/* 내 옷장: 이름/색/장식을 고르면 서버가 그려주는 미리보기로 바로 바뀌고, '저장하기'를 누르면 저장돼요. */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  // 장식 상태: 자리 → 'auto' | 'none' | 장식id  (서버에서는 null 이 '안 입기')
  const sel = { color: CLOSET.color, slots: {} };
  CLOSET.slotIds.forEach((id) => {
    const v = CLOSET.slots[id];
    sel.slots[id] = id in CLOSET.slots ? (v === null ? "none" : v) : "auto";
  });

  let t = null;
  function preview() {
    clearTimeout(t);
    t = setTimeout(async () => {
      const q = new URLSearchParams({ color: sel.color, slots: JSON.stringify(sel.slots) });
      const res = await fetch("/closet/preview?" + q);
      const worn = JSON.parse(res.headers.get("X-Worn") || "{}");
      const html = await res.text();
      const box = $("#closetPreview");
      box.innerHTML = html;
      document.querySelectorAll(".slot-card").forEach((card) => {         // 지금 입고 있는 칸 표시
        card.querySelectorAll(".tile").forEach((x) => x.classList.toggle("on", (worn[card.dataset.slot] || "none") === x.dataset.val));
      });
      const svg = box.firstElementChild; svg.classList.remove("pop"); void svg.getBoundingClientRect(); svg.classList.add("pop");
    }, 60);
  }

  $("#swatches").addEventListener("click", (e) => {
    const b = e.target.closest(".swatch"); if (!b || b.disabled) return;
    document.querySelectorAll(".swatch").forEach((x) => x.classList.toggle("on", x === b));
    sel.color = b.dataset.color;
    document.querySelectorAll(".mini-char .skin[style*='fill']").forEach((p) => { if ((p.getAttribute("d") || "").startsWith("M33 30")) p.style.fill = b.style.getPropertyValue("--c"); });
    preview();
  });
  document.querySelectorAll(".slot-card").forEach((card) => card.addEventListener("click", (e) => {
    const b = e.target.closest(".tile"); if (!b || b.disabled) return;
    card.querySelectorAll(".tile").forEach((x) => x.classList.toggle("on", x === b));
    sel.slots[card.dataset.slot] = b.dataset.val; preview();
  }));

  $("#closetAuto").addEventListener("click", () => { CLOSET.slotIds.forEach((id) => (sel.slots[id] = "auto")); preview(); });

  $("#closetSave").addEventListener("click", async () => {
    const slots = {};
    Object.entries(sel.slots).forEach(([k, v]) => (slots[k] = v));
    try {
      await api("POST", "/api/closet", { name: $("#closetName").value, color: sel.color, slots });
      burst(innerWidth / 2, 220, 24); reloadWithToast("저장했어요! 멋져요");
    } catch (e) { toast("저장 실패. 서버가 켜져 있나요?"); }
  });
  $("#closetReset").addEventListener("click", async () => {
    if (!confirm("이름, 색, 장식을 모두 처음 모습으로 되돌릴까요?")) return;
    try { await api("POST", "/api/closet", { reset: true }); reloadWithToast("처음 모습으로 돌아왔어요"); }
    catch (e) { toast("저장 실패"); }
  });
})();
