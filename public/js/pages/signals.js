import { api, esc, flag, fmtPrice, fmtPct, cls, sparkline, shortSym, goTrade } from '../util.js';

let market = 'id';
let filter = 'all';

const SCORE_COLOR = s => (s >= 70 ? 'var(--up)' : s >= 55 ? '#6ee7b7' : s >= 40 ? 'var(--muted)' : 'var(--down)');

export default function signals(el) {
  el.innerHTML = `
    <div class="page-head">
      <div><h1>Stock Ideas</h1><p>Stocks ranked by a transparent trend · momentum · risk score. Use it as a shortlist for your own research.</p></div>
      <div class="row">
        <div class="seg" id="sg-market"><button data-m="id">${flag('id')} Indonesia</button><button data-m="us">${flag('us')} US</button></div>
      </div>
    </div>
    <div class="disclaimer" style="margin-bottom:16px">
      <b>Not financial advice.</b> Scores are computed automatically from price history only (no fundamentals, news or valuation) and past performance doesn’t predict future returns.
      Check company financials, diversify, and consider a licensed advisor before investing.
    </div>
    <div id="sg-body"><div class="loading">Scoring stocks…</div></div>`;

  const seg = el.querySelector('#sg-market');
  const setActive = () => seg.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.m === market));
  seg.querySelectorAll('button').forEach(b => b.onclick = () => { market = b.dataset.m; setActive(); load(); });
  setActive();

  const body = el.querySelector('#sg-body');
  let data = null;

  async function load() {
    body.innerHTML = '<div class="loading">Scoring stocks…</div>';
    try { data = await api('/api/signals?market=' + market); draw(); }
    catch (e) { body.innerHTML = `<div class="error">Could not load signals: ${esc(e.message)}</div>`; }
  }

  function draw() {
    const rows = data.rows;
    // Highlight the best-scoring names that aren't stretched (overbought) right now.
    const picks = rows.filter(r => r.setup !== 'Overbought' && r.setup !== 'Downtrend').slice(0, 4);
    const pullbacks = rows.filter(r => r.setup === 'Pullback in uptrend' || r.setup === 'Oversold');
    const setups = ['all', ...new Set(rows.map(r => r.setup))];
    const shown = filter === 'all' ? rows : rows.filter(r => r.setup === filter);

    body.innerHTML = `
      <h2 style="font-size:15px;margin:0 0 10px">Top-ranked right now <span class="muted small" style="font-weight:400">highest score, excluding overbought &amp; downtrends</span></h2>
      <div class="grid g4" style="margin-bottom:20px">${picks.map(pickCard).join('')}</div>

      ${pullbacks.length ? `<div class="card" style="margin-bottom:16px"><h2>Watch for entries <span class="sub">Long-term uptrend but short-term dip, or oversold</span></h2>
        <div class="chips">${pullbacks.map(r => `<span class="chip" data-go="${esc(r.symbol)}">${esc(shortSym(r.symbol))} <span class="muted">${esc(r.setup)}</span> <span class="num">RSI ${r.rsi?.toFixed(0)}</span></span>`).join('')}</div></div>` : ''}

      <div class="card">
        <h2>Full ranking <span class="row">${setups.map(s => `<span class="chip ${filter === s ? 'active' : ''}" data-filter="${esc(s)}">${s === 'all' ? 'All' : esc(s)}</span>`).join('')}</span></h2>
        <div class="table-wrap"><table>
          <thead><tr><th>#</th><th>Stock</th><th>Sector</th><th class="r">Price</th><th class="r">1D</th><th class="r">1M</th><th class="r">3M</th><th class="r">6M</th><th class="r">RSI</th><th class="r">From 52w high</th><th>60-day</th><th>Score</th><th>Setup</th></tr></thead>
          <tbody>${shown.map((r, i) => `
            <tr class="click" data-row="${esc(r.symbol)}">
              <td class="muted">${rows.indexOf(r) + 1}</td>
              <td><b>${esc(shortSym(r.symbol))}</b><div class="muted small" style="max-width:180px;overflow:hidden;text-overflow:ellipsis">${esc(r.name)}</div></td>
              <td class="muted small">${esc(r.sector)}</td>
              <td class="r num">${fmtPrice(r.price, r.currency)}</td>
              <td class="r num ${cls(r.changePct)}">${fmtPct(r.changePct, 1)}</td>
              <td class="r num ${cls(r.ret1m)}">${fmtPct(r.ret1m, 1)}</td>
              <td class="r num ${cls(r.ret3m)}">${fmtPct(r.ret3m, 1)}</td>
              <td class="r num ${cls(r.ret6m)}">${fmtPct(r.ret6m, 1)}</td>
              <td class="r num ${r.rsi > 70 ? 'down' : r.rsi < 30 ? 'up' : ''}">${r.rsi?.toFixed(0) ?? '—'}</td>
              <td class="r num">${fmtPct(r.fromHigh, 1)}</td>
              <td>${sparkline(r.spark, { width: 90, height: 26 })}</td>
              <td><span class="scorebar"><i style="width:${r.score}%;background:${SCORE_COLOR(r.score)}"></i></span><b class="num">${r.score}</b> <span class="badge ${r.rating}">${r.rating}</span></td>
              <td class="small">${esc(r.setup)}</td>
            </tr>`).join('')}</tbody>
        </table></div>
        <p class="muted small" style="margin:12px 0 0">Click a row to see why it scored that way.</p>
      </div>

      <div class="card" style="margin-top:16px">
        <h2>How the score works (0–100)</h2>
        <div class="grid g4 small">
          <div><b>Trend · 30</b><p class="muted">Price above 50- and 200-day moving averages, and 50-day above 200-day.</p></div>
          <div><b>Momentum · 35</b><p class="muted">3- and 6-month return, ranked against the other stocks in this list.</p></div>
          <div><b>RSI · 15</b><p class="muted">Rewards a healthy RSI (45–65); penalises overbought (&gt;72).</p></div>
          <div><b>Risk · 20</b><p class="muted">Lower 60-day volatility and staying close to the 52-week high score higher.</p></div>
        </div>
      </div>`;

    body.querySelectorAll('[data-filter]').forEach(c => c.onclick = () => { filter = c.dataset.filter; draw(); });
    body.querySelectorAll('[data-go]').forEach(c => c.onclick = () => goTrade(c.dataset.go));
    body.querySelectorAll('tr[data-row]').forEach(tr => tr.onclick = () => toggleDetail(tr, rows.find(r => r.symbol === tr.dataset.row)));
  }

  function toggleDetail(tr, r) {
    if (tr.nextElementSibling?.classList.contains('detail')) return tr.nextElementSibling.remove();
    const d = document.createElement('tr');
    d.className = 'detail';
    d.innerHTML = `<td colspan="13">
      <div class="row" style="justify-content:space-between;align-items:flex-start">
        <div>
          <div class="parts"><span>Trend <b>${r.parts.trend}/30</b></span><span>Momentum <b>${r.parts.momentum}/35</b></span><span>RSI <b>${r.parts.rsi}/15</b></span><span>Risk <b>${r.parts.risk}/20</b></span><span class="muted">Volatility ${r.vol?.toFixed(0)}%/yr</span></div>
          <ul class="reasons">${r.reasons.map(([s, t]) => `<li class="${s === '+' ? 'p' : s === '-' ? 'm' : 't'}">${esc(t)}</li>`).join('')}</ul>
        </div>
        <button class="btn sm primary">Open chart →</button>
      </div></td>`;
    d.querySelector('button').onclick = () => goTrade(r.symbol);
    tr.after(d);
  }

  load();
}

function pickCard(r) {
  const c = SCORE_COLOR(r.score);
  const circ = 2 * Math.PI * 22;
  return `<div class="card pick" data-go="${esc(r.symbol)}">
    <div class="top">
      <div style="min-width:0"><div class="sym">${esc(shortSym(r.symbol))}</div><div class="muted small" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.name)}</div></div>
      <svg class="score-ring" viewBox="0 0 54 54"><circle cx="27" cy="27" r="22" fill="none" stroke="var(--panel-2)" stroke-width="5"/>
        <circle cx="27" cy="27" r="22" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round" stroke-dasharray="${(r.score / 100) * circ} ${circ}" transform="rotate(-90 27 27)"/>
        <text x="27" y="32" text-anchor="middle" fill="var(--text)" font-size="15" font-weight="700" font-family="Inter">${r.score}</text></svg>
    </div>
    <div class="row" style="margin:8px 0"><span class="num" style="font-size:16px;font-weight:600">${fmtPrice(r.price, r.currency)}</span><span class="num small ${cls(r.ret3m)}">3M ${fmtPct(r.ret3m, 1)}</span></div>
    ${sparkline(r.spark, { width: 240, height: 36 })}
    <div class="row small" style="margin-top:8px"><span class="badge ${r.rating}">${r.rating}</span><span class="muted">${esc(r.setup)}</span></div>
    <ul class="reasons">${r.reasons.filter(x => x[0] === '+').slice(0, 2).map(([, t]) => `<li class="p">${esc(t)}</li>`).join('')}</ul>
  </div>`;
}
