/* 환율 화면 (홈의 '오늘의 환율' + 무역 학원의 환율 계산기/환차손익 시뮬레이터)
   서버의 /api/rates 에서 USD 기준 환율을 받아 와서, 필요한 계산은 브라우저에서 해요. */
(function () {
  const fmt = (n, d = 2) => Number(n).toLocaleString("ko-KR", { maximumFractionDigits: d });
  let promise = null;
  function loadRates() {
    if (!promise) promise = fetch("/api/rates").then((r) => r.json()).catch(() => ({ ok: false, error: "서버에 연결하지 못했어요." }));
    return promise;
  }
  const krwPer = (rates, code) => rates.KRW / rates[code];      // 1 단위 = 몇 원?
  const when = (s) => { const d = new Date(s); return isNaN(d) ? "" : d.toLocaleDateString("ko-KR", { month: "long", day: "numeric" }) + " 기준"; };

  // ---------- 홈: 오늘의 환율 ----------
  const board = document.getElementById("fxBoard");
  if (board) loadRates().then((d) => {
    const note = document.getElementById("fxNote");
    if (!d.ok) { board.innerHTML = ""; note.textContent = d.error; note.classList.add("fx-error"); return; }
    const rows = [["USD", 1, "1달러"], ["EUR", 1, "1유로"], ["JPY", 100, "100엔"], ["CNY", 1, "1위안"], ["VND", 100, "100동"]];
    board.innerHTML = rows.filter(([c]) => d.rates[c]).map(([c, unit, label]) =>
      `<div class="fx-tile"><span class="note">${label}</span><b>${fmt(krwPer(d.rates, c) * unit)}<small>원</small></b></div>`).join("");
    note.textContent = (when(d.updated) || "") + (d.stale ? " · 오래된 데이터예요 (" + d.error + ")" : "");
    if (d.stale) note.classList.add("fx-error");
  });

  // ---------- 무역 학원: 계산기 ----------
  const calc = document.getElementById("fxCalc");
  if (calc) loadRates().then((d) => {
    const msg = document.getElementById("fxMsg");
    if (!d.ok) { msg.textContent = d.error; msg.classList.add("fx-error"); calc.querySelectorAll("input,select").forEach((e) => (e.disabled = true)); return; }
    const from = document.getElementById("fxFrom"), to = document.getElementById("fxTo"), amt = document.getElementById("fxAmount"), out = document.getElementById("fxResult");
    const opts = d.currencies.filter((c) => d.rates[c.code]).map((c) => `<option value="${c.code}">${c.code} · ${c.name}</option>`).join("");
    from.innerHTML = opts; to.innerHTML = opts; from.value = "USD"; to.value = "KRW";
    function run() {
      const a = parseFloat(amt.value) || 0;
      const v = a * d.rates[to.value] / d.rates[from.value];
      out.textContent = `${fmt(a)} ${from.value} = ${fmt(v)} ${to.value}`;
    }
    [from, to, amt].forEach((e) => e.addEventListener("input", run));
    document.getElementById("fxSwap").addEventListener("click", () => { [from.value, to.value] = [to.value, from.value]; run(); });
    msg.textContent = (when(d.updated) || "") + (d.stale ? " · 오래된 데이터예요" : "");
    run();

    // ---------- 환차손익 시뮬레이터 ----------
    const usd = document.getElementById("simUsd"), a = document.getElementById("simA"), b = document.getElementById("simB"), res = document.getElementById("simResult");
    const now = Math.round(krwPer(d.rates, "USD") * 100) / 100;
    a.value = now; b.value = now;
    function sim() {
      const u = parseFloat(usd.value) || 0, A = parseFloat(a.value) || 0, B = parseFloat(b.value) || 0;
      const role = document.querySelector("input[name=simRole]:checked").value;
      const diff = u * (B - A), pct = A ? ((B - A) / A) * 100 : 0;
      const good = role === "export" ? diff >= 0 : diff <= 0;
      const what = role === "export" ? (diff >= 0 ? "환차익" : "환차손") : (diff <= 0 ? "환차익" : "환차손");
      res.className = "sim-result " + (diff === 0 ? "" : good ? "good" : "bad");
      res.innerHTML = `계약 때 <b>${fmt(u * A, 0)}원</b> → 결제 때 <b>${fmt(u * B, 0)}원</b><br>` +
        (diff === 0 ? "환율이 그대로라 차이가 없어요." : `<b>${what} ${fmt(Math.abs(diff), 0)}원</b> (환율 ${pct >= 0 ? "+" : ""}${fmt(pct)}%)`);
    }
    [usd, a, b].forEach((e) => e.addEventListener("input", sim));
    document.querySelectorAll("input[name=simRole]").forEach((e) => e.addEventListener("change", sim));
    sim();
  });
})();
