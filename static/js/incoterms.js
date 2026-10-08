/* 인코텀즈 슬라이더: 규칙을 고르면 10개 구간을 누가 맡는지, 위험이 어디서 넘어가는지 보여줘요. (data/incoterms.json) */
(function () {
  const root = document.getElementById("inco");
  if (!root || typeof INCO === "undefined") return;
  const chips = document.getElementById("incoChips"), stepsEl = document.getElementById("incoSteps");
  const flag = document.getElementById("riskFlag"), range = document.getElementById("incoRange");
  const info = document.getElementById("incoInfo"), acc = document.getElementById("incoAcc"), accRes = document.getElementById("incoAccResult");
  const RISK = {
    EXW: "물품이 매도인 공장에서 매수인 처분에 놓이는 때", FCA: "지정 장소(터미널)에서 운송인에게 넘기는 때",
    FAS: "선적항 부두에서 배 옆에 놓는 때", FOB: "물품이 본선(배)에 실리는 때",
    CFR: "물품이 본선에 실리는 때 (운임은 매도인이 계속 부담)", CIF: "물품이 본선에 실리는 때 (운임과 보험은 매도인이 계속 부담)",
    CPT: "첫 운송인에게 넘기는 때 (운송비는 매도인이 계속 부담)", CIP: "첫 운송인에게 넘기는 때 (운송비와 보험은 매도인이 계속 부담)",
    DAP: "도착지에 도착해 하차 준비가 된 때", DPU: "도착지에서 하차까지 마친 때", DDP: "도착지에 도착해 하차 준비가 된 때 (관세까지 매도인 부담)",
  };
  const ACC_STEPS = [1, 3, 4, 5, 7, 9, 10];            // 사고가 날 수 있는 '장소'가 있는 구간
  let cur = 3;

  chips.innerHTML = INCO.rules.map((r, i) => `<button type="button" class="chip" data-i="${i}">${r.code}</button>`).join("");
  stepsEl.innerHTML = INCO.steps.map((s, i) => `<div class="inco-step" data-n="${i + 1}"><b>${i + 1}</b><span>${s}</span></div>`).join("");
  acc.innerHTML = ACC_STEPS.map((n) => `<option value="${n}">${n}단계 · ${INCO.steps[n - 1]} 중</option>`).join("");
  acc.value = "5";

  function render() {
    const r = INCO.rules[cur];
    range.value = cur;
    chips.querySelectorAll(".chip").forEach((c, i) => c.classList.toggle("active", i === cur));
    stepsEl.querySelectorAll(".inco-step").forEach((el, i) => {
      const seller = r.seller.includes(i + 1);
      el.classList.toggle("s", seller); el.classList.toggle("b", !seller);
    });
    flag.style.left = (r.risk_after * 10) + "%";
    flag.classList.toggle("edge-r", r.risk_after >= 10); flag.classList.toggle("edge-l", r.risk_after === 0);
    info.innerHTML = `<h3>${r.code} <span class="muted">${r.ko}</span> <span class="tag ${r.sea_only ? "" : "yellow"}">${r.sea_only ? "해상·내수로 전용" : "모든 운송방식"}</span></h3>
      <p>${r.summary}</p><p class="note" style="margin:0">위험이 넘어가는 때: ${RISK[r.code]} · 수출자가 맡는 구간 ${r.seller.length}/10</p>`;
    info.classList.remove("swap"); void info.offsetWidth; info.classList.add("swap");
    accident();
  }
  function accident() {
    const r = INCO.rules[cur], n = +acc.value;
    const seller = n <= r.risk_after;
    accRes.className = "sim-result " + (seller ? "bad" : "good");
    accRes.innerHTML = `${n}단계(${INCO.steps[n - 1]}) 중 사고가 나면 <b>${seller ? "수출자" : "수입자"}</b>가 손해를 떠안아요.<br><span class="note">${seller ? "아직 위험이 넘어가기 전이에요." : "이미 위험이 넘어간 뒤예요. 보험이 있으면 보험으로 처리할 수 있어요."}</span>`;
  }
  chips.addEventListener("click", (e) => { const c = e.target.closest(".chip"); if (c) { cur = +c.dataset.i; render(); } });
  range.addEventListener("input", () => { cur = +range.value; render(); });
  acc.addEventListener("input", accident);
  render();
})();
