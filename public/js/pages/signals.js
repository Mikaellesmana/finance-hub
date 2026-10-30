import { api, esc, flag, fmtPrice, fmtPct, cls, sparkline, shortSym, goTrade } from '../util.js';

let market = 'id';
let filter = 'all';

const CALLS = ['Buy', 'Buy on dip', 'Hold', 'Take profit', 'Sell'];
const SCORE_COLOR = s => (s >= 70 ? 'var(--up)' : s >= 55 ? '#6ee7b7' : s >= 40 ? 'var(--muted)' : 'var(--down)');
const slug = c => c.toLowerCase().replace(/\s+/g, '-');
const callBadge = c => `<span class="act act-${slug(c)}">${esc(c)}</span>`;

function myHoldings() {
  try { return (JSON.parse(localStorage.getItem('fh-finance'))?.holdings || []).map(h => h.symbol); }
  catch { return []; }
}

export default function signals(el) {
  el.innerHTML = `
    <div class="page-head">
      <div><h1>Stock Ideas</h1><p>Buy / Hold / Sell signals with buy zones, stop-losses and targets — ranked by trend, momentum and risk.</p></div>
      <div class="row">
        <div class="seg" id="sg-market"><button data-m="id">${flag('id')} Indonesia</button><button data-m="us">${flag('us')} US</button></div>
      </div>
    </div>
    <div class="disclaimer" style="margin-bottom:16px">
      <b>Not financial advice.</b> Signals are generated automatically by fixed rules from price history only — no fundamentals, news or valuation.
      They can and will be wrong. Do your own research, never risk money you can’t afford to lose, and consider a licensed advisor.
    </div>
    <div id="sg-holdings"></div>
    <div id="sg-body"><div class="loading">Scoring stocks…</div></div>`;

  const seg = el.querySelector('#sg-market');
  const setActive = () => seg.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.m === market));
  seg.querySelectorAll('button').forEach(b => b.onclick = () => { market = b.dataset.m; filter = 'all'; setActive(); load(); });
  setActive();

  const body = el.querySelector('#sg-body');
  let data = null;

  el.addEventListener('click', e => {
    const go = e.target.closest('[data-go]');
    if (go) goTrade(go.dataset.go);
  });

  async function load() {
    body.innerHTML = '<div class="loading">Scoring stocks…</div>';
    try { data = await api('/api/signals?market=' + market); draw(); }
    catch (e) { body.innerHTML = `<div class="error">Could not load signals: ${esc(e.message)}</div>`; }
  }

  function draw() {
    const rows = data.rows;
    const counts = Object.fromEntries(CALLS.map(c => [c, rows.filter(r => r.call === c).length]));
    const buys = rows.filter(r => r.call === 'Buy' || r.call === 'Buy on dip').slice(0, 4);
    const exits = rows.filter(r => r.call === 'Take profit' || r.call === 'Sell').sort((a, b) => a.score - b.score).slice(0, 8);
    const shown = filter === 'all' ? rows : rows.filter(r => r.call === filter);

    body.innerHTML = `
      <div class="card" style="margin-bottom:16px">
        <h2>Market mood <span class="sub">${rows.length} stocks scanned · ${new Date(data.updated).toLocaleTimeString()}</span></h2>
        <div class="signal-bar">${CALLS.map(c => counts[c] ? `<div class="act-${slug(c)}" style="flex:${counts[c]}" title="${c}: ${counts[c]}"></div>` : '').join('')}</div>
        <div class="row small" style="margin-top:8px">${CALLS.map(c => `<span>${callBadge(c)} <b class="num">${counts[c]}</b></span>`).join('')}</div>
        <p class="muted small" style="margin:10px 0 0">${moodText(counts, rows.length)}</p>
      </div>

      <h2 style="font-size:15px;margin:0 0 10px">When to buy <span class="muted small" style="font-weight:400">best-scoring Buy and Buy-on-dip signals, with a trade plan</span></h2>
      ${buys.length ? `<div class="grid g4" style="margin-bottom:20px">${buys.map(planCard).join('')}</div>`
        : '<div class="empty" style="margin-bottom:20px">No stock passes the buy rules right now. In weak markets, holding cash and waiting is a valid decision.</div>'}

      ${exits.length ? `<div class="card" style="margin-bottom:16px"><h2>When to sell <span class="sub">Downtrends to avoid and overheated stocks to take profit on</span></h2>
        <div class="table-wrap"><table><tbody>${exits.map(r => `<tr class="click" data-go="${esc(r.symbol)}">
          <td><b>${esc(shortSym(r.symbol))}</b><div class="muted small">${esc(r.name)}</div></td>
          <td>${callBadge(r.call)}</td>
          <td class="small" style="white-space:normal">${planText(r)}</td></tr>`).join('')}</tbody></table></div></div>` : ''}

      <div class="card">
        <h2>All signals <span class="row">${['all', ...CALLS].map(s => `<span class="chip ${filter === s ? 'active' : ''}" data-filter="${esc(s)}">${s === 'all' ? 'All' : esc(s)}${s !== 'all' ? ` <span class="muted">${counts[s]}</span>` : ''}</span>`).join('')}</span></h2>
        <div class="table-wrap"><table>
          <thead><tr><th>#</th><th>Stock</th><th>Signal</th><th class="r">Price</th><th class="r">1D</th><th class="r">1M</th><th class="r">3M</th><th class="r">RSI</th><th>60-day</th><th>Score</th><th class="r">Buy zone</th><th class="r">Stop</th><th class="r">Target</th></tr></thead>
          <tbody>${shown.map(r => `
            <tr class="click" data-row="${esc(r.symbol)}">
              <td class="muted">${rows.indexOf(r) + 1}</td>
              <td><b>${esc(shortSym(r.symbol))}</b><div class="muted small" style="max-width:170px;overflow:hidden;text-overflow:ellipsis">${esc(r.name)}</div></td>
              <td>${callBadge(r.call)}</td>
              <td class="r num">${fmtPrice(r.price, r.currency)}</td>
              <td class="r num ${cls(r.changePct)}">${fmtPct(r.changePct, 1)}</td>
              <td class="r num ${cls(r.ret1m)}">${fmtPct(r.ret1m, 1)}</td>
              <td class="r num ${cls(r.ret3m)}">${fmtPct(r.ret3m, 1)}</td>
              <td class="r num ${r.rsi > 70 ? 'down' : r.rsi < 30 ? 'up' : ''}">${r.rsi?.toFixed(0) ?? '—'}</td>
              <td>${sparkline(r.spark, { width: 80, height: 24 })}</td>
              <td><span class="scorebar"><i style="width:${r.score}%;background:${SCORE_COLOR(r.score)}"></i></span><b class="num">${r.score}</b></td>
              <td class="r num small">${r.levels.entryHigh != null ? `${p(r, r.levels.entryLow)}–${p(r, r.levels.entryHigh)}` : '—'}</td>
              <td class="r num small down">${p(r, r.levels.stop)}</td>
              <td class="r num small up">${p(r, r.levels.target1)}</td>
            </tr>`).join('')}</tbody>
        </table></div>
        <p class="muted small" style="margin:12px 0 0">Click a row for the full plan and the reasons behind the score.</p>
      </div>

      ${methodology()}`;

    body.querySelectorAll('[data-filter]').forEach(c => c.onclick = () => { filter = c.dataset.filter; draw(); });
    body.querySelectorAll('tr[data-row]').forEach(tr => tr.onclick = () => toggleDetail(tr, rows.find(r => r.symbol === tr.dataset.row)));
  }

  function toggleDetail(tr, r) {
    if (tr.nextElementSibling?.classList.contains('detail')) return tr.nextElementSibling.remove();
    const d = document.createElement('tr');
    d.className = 'detail';
    d.innerHTML = `<td colspan="13">
      <div class="row" style="justify-content:space-between;align-items:flex-start;gap:20px">
        <div style="flex:1;min-width:260px">
          <div class="small" style="margin-bottom:10px">${callBadge(r.call)} ${planText(r)}</div>
          <div class="parts"><span>Trend <b>${r.parts.trend}/30</b></span><span>Momentum <b>${r.parts.momentum}/35</b></span><span>RSI <b>${r.parts.rsi}/15</b></span><span>Risk <b>${r.parts.risk}/20</b></span><span class="muted">Typical daily move ±${r.atrPct?.toFixed(1)}%</span></div>
          <ul class="reasons">${r.reasons.map(([s, t]) => `<li class="${s === '+' ? 'p' : s === '-' ? 'm' : 't'}">${esc(t)}</li>`).join('')}</ul>
        </div>
        <button class="btn sm primary" data-go="${esc(r.symbol)}">Open chart →</button>
      </div></td>`;
    tr.after(d);
  }

  loadHoldings(el.querySelector('#sg-holdings'));
  load();
}

async function loadHoldings(box) {
  const syms = [...new Set(myHoldings())];
  if (!syms.length) return;
  box.innerHTML = '<div class="card" style="margin-bottom:16px"><div class="loading">Checking your holdings…</div></div>';
  try {
    const { rows } = await api('/api/signals?symbols=' + encodeURIComponent(syms.join(',')));
    if (!rows.length) { box.innerHTML = ''; return; }
    box.innerHTML = `<div class="card holdings-card" style="margin-bottom:16px">
      <h2>Your holdings <span class="sub">from My Finances · what the rules say for each</span></h2>
      <div class="table-wrap"><table><tbody>${rows.map(r => `<tr class="click" data-go="${esc(r.symbol)}">
        <td><b>${esc(shortSym(r.symbol))}</b><div class="muted small">${esc(r.name)}</div></td>
        <td class="r num">${fmtPrice(r.price, r.currency)}<div class="small ${cls(r.changePct)}">${fmtPct(r.changePct, 1)}</div></td>
        <td>${callBadge(r.call)}</td>
        <td class="small" style="white-space:normal">${holderText(r)}</td></tr>`).join('')}</tbody></table></div></div>`;
  } catch { box.innerHTML = ''; }
}

const p = (r, v) => fmtPrice(v, r.currency);
const pct = (r, v) => fmtPct((v / r.price - 1) * 100, 1);

// Plan for someone deciding whether to buy (or exit) now.
function planText(r) {
  const L = r.levels;
  switch (r.call) {
    case 'Buy': return `Buy zone <b>${p(r, L.entryLow)}–${p(r, L.entryHigh)}</b>. Cut loss if it closes below <b class="down">${p(r, L.stop)}</b> (${pct(r, L.stop)}). Take profit near <b class="up">${p(r, L.target1)}</b> (${pct(r, L.target1)}), then <b class="up">${p(r, L.target2)}</b>.`;
    case 'Buy on dip': return `Uptrend, but not a good entry yet. Wait for a pullback into <b>${p(r, L.entryLow)}–${p(r, L.entryHigh)}</b> that holds, then buy. Stop below <b class="down">${p(r, L.stop)}</b>; first target <b class="up">${p(r, L.target1)}</b>.`;
    case 'Take profit': return `Overheated (RSI ${r.rsi?.toFixed(0)}, ${r.stretch.toFixed(1)}× its normal daily move above the 20-day average). Holders: sell part, or raise your stop to <b>${p(r, L.trailStop)}</b>. New buyers: wait for a pullback to <b>${p(r, L.entryLow)}–${p(r, L.entryHigh)}</b>.`;
    case 'Sell': return `Downtrend / weak score. Avoid new buys. Holders: consider exiting, especially on bounces toward the 50-day average (<b>${p(r, L.sma50)}</b>). Turns positive again only above <b>${p(r, L.reclaim)}</b>.`;
    default: return `No clear edge. Holders: keep, with a stop near <b class="down">${p(r, L.stop)}</b>. New buy only after it closes above the 50-day average (<b>${p(r, L.sma50)}</b>) with score ≥ 60.`;
  }
}

// Same signal, worded for someone who already owns the stock.
function holderText(r) {
  const L = r.levels;
  switch (r.call) {
    case 'Buy': return `<b>Hold / add.</b> Trend is healthy. You can add within ${p(r, L.entryLow)}–${p(r, L.entryHigh)}; keep a stop at ${p(r, L.stop)}.`;
    case 'Buy on dip': return `<b>Hold.</b> Uptrend intact. Add only on a dip to ${p(r, L.entryLow)}–${p(r, L.entryHigh)}. Stop ${p(r, L.stop)}.`;
    case 'Take profit': return `<b>Lock in gains.</b> Consider selling part, and move your stop up to ${p(r, L.trailStop)}.`;
    case 'Sell': return `<b>Review / reduce.</b> Downtrend. Consider selling on a bounce toward ${p(r, L.sma50)}; it turns positive again above ${p(r, L.reclaim)}.`;
    default: return `<b>Hold.</b> No strong signal either way. Exit if it closes below ${p(r, L.stop)}.`;
  }
}

function moodText(c, n) {
  const bull = (c['Buy'] + c['Buy on dip']) / n, bear = c['Sell'] / n;
  if (bear > 0.6) return 'Most stocks are in downtrends — a defensive market. Rules favour holding cash, small positions and strict stop-losses until trends recover.';
  if (bull > 0.5) return 'Broad uptrend — many stocks pass the buy rules. Still avoid chasing overheated names; buy in the zones.';
  if (c['Take profit'] / n > 0.25) return 'Many stocks look overheated. Good time to take some profit and be patient with new buys.';
  return 'Mixed market — be selective and stick to stocks with a clear plan (buy zone + stop).';
}

function planCard(r) {
  const c = SCORE_COLOR(r.score);
  const circ = 2 * Math.PI * 22;
  const L = r.levels;
  return `<div class="card pick" data-go="${esc(r.symbol)}">
    <div class="top">
      <div style="min-width:0"><div class="sym">${esc(shortSym(r.symbol))}</div><div class="muted small" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.name)}</div></div>
      <svg class="score-ring" viewBox="0 0 54 54"><circle cx="27" cy="27" r="22" fill="none" stroke="var(--panel-2)" stroke-width="5"/>
        <circle cx="27" cy="27" r="22" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round" stroke-dasharray="${(r.score / 100) * circ} ${circ}" transform="rotate(-90 27 27)"/>
        <text x="27" y="32" text-anchor="middle" fill="var(--text)" font-size="15" font-weight="700" font-family="Inter">${r.score}</text></svg>
    </div>
    <div class="row" style="margin:8px 0"><span class="num" style="font-size:16px;font-weight:600">${p(r, r.price)}</span>${callBadge(r.call)}</div>
    ${sparkline(r.spark, { width: 240, height: 36 })}
    <div class="plan">
      <div><span>Buy zone</span><b class="num">${p(r, L.entryLow)}–${p(r, L.entryHigh)}</b></div>
      <div><span>Stop-loss</span><b class="num down">${p(r, L.stop)} <small>${pct(r, L.stop)}</small></b></div>
      <div><span>Target 1</span><b class="num up">${p(r, L.target1)} <small>${pct(r, L.target1)}</small></b></div>
      <div><span>Target 2</span><b class="num up">${p(r, L.target2)} <small>${pct(r, L.target2)}</small></b></div>
    </div>
  </div>`;
}

function methodology() {
  return `<div class="card" style="margin-top:16px">
    <h2>How the signals work</h2>
    <div class="grid g4 small" style="margin-bottom:14px">
      <div><b>Trend · 30</b><p class="muted">Price above 50- and 200-day moving averages, and 50-day above 200-day.</p></div>
      <div><b>Momentum · 35</b><p class="muted">3- and 6-month return, ranked against the other stocks in this list.</p></div>
      <div><b>RSI · 15</b><p class="muted">Rewards a healthy RSI (45–65); penalises overbought (&gt;72).</p></div>
      <div><b>Risk · 20</b><p class="muted">Lower volatility and staying close to the 52-week high score higher.</p></div>
    </div>
    <div class="grid g3 small">
      <div>${callBadge('Buy')}<p class="muted">Score ≥ 60, above the 50-day average, RSI 40–70, and not more than 1.5 daily moves (ATR) above the 20-day average.</p></div>
      <div>${callBadge('Buy on dip')}<p class="muted">Good score (≥ 55) and long-term uptrend, but price is stretched — wait for the pullback zone.</p></div>
      <div>${callBadge('Hold')}<p class="muted">No clear edge. Keep existing positions with a stop; don’t open new ones.</p></div>
      <div>${callBadge('Take profit')}<p class="muted">RSI ≥ 75 or more than 3 daily moves above the 20-day average — likely to cool off.</p></div>
      <div>${callBadge('Sell')}<p class="muted">Score below 35, or a downtrend (below 50- and 200-day averages) with score below 50.</p></div>
      <div><b>Levels</b><p class="muted">Stop = 2× ATR below the entry, targets = 3× and 5× ATR above (or the 52-week high). Prices are rounded to valid exchange ticks.</p></div>
    </div>
  </div>`;
}
