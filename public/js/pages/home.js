import { api, esc, fmtPrice, fmtPct, cls, sparkline, goTrade } from '../util.js';

const DOT = { pos: '+', neg: '−', neu: '~' };

export default function home(el) {
  el.innerHTML = `
    <div class="page-head">
      <div><h1>Indonesia Economy Watch</h1><p>What’s happening in the economy — and how it’s likely to affect Indonesian stocks.</p></div>
      <div class="row"><span class="muted small" id="hm-updated"></span></div>
    </div>
    <div id="hm-body"><div class="loading">Reading the economy…</div></div>`;

  const body = el.querySelector('#hm-body');
  body.addEventListener('click', e => {
    const t = e.target.closest('[data-sym]');
    if (t) goTrade(t.dataset.sym);
  });

  api('/api/home').then(d => {
    el.querySelector('#hm-updated').textContent = 'Live data · ' + new Date(d.updated).toLocaleTimeString();
    render(body, d);
  }).catch(e => { body.innerHTML = `<div class="error">Could not load: ${esc(e.message)}</div>`; });
}

function render(body, d) {
  const jkse = d.indo.find(x => x.symbol === '^JKSE');
  const lq45 = d.indo.find(x => x.symbol === '^JKLQ45');
  const eido = d.indo.find(x => x.symbol === 'EIDO');
  const tones = [...d.drivers.map(x => x.tone), ...d.snapshot.items.map(x => x.tone)];
  // The index's own trend counts double: a falling market is the clearest sign of headwinds.
  const trend = jkse ? (jkse.chg1m <= -5 ? -2 : jkse.chg1m < -1 ? -1 : jkse.chg1m >= 5 ? 2 : jkse.chg1m > 1 ? 1 : 0) : 0;
  const net = tones.filter(t => t === 'pos').length - tones.filter(t => t === 'neg').length + trend;
  const verdict = net <= -2 ? ['Headwinds', 'var(--down)', 'rgba(239,68,68,.15)'] : net >= 2 ? ['Tailwinds', 'var(--up)', 'rgba(34,197,94,.15)'] : ['Mixed', 'var(--warn)', 'rgba(245,158,11,.15)'];
  const movers = d.drivers.filter(x => x.moved && x.tone !== 'neu').sort((a, b) => Math.abs(b.chg1m) - Math.abs(a.chg1m));

  // Tally sector winners / losers across all live drivers.
  const tally = (key) => { const m = {}; d.drivers.forEach(x => x[key].forEach(s => { m[s] = (m[s] || 0) + 1; })); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
  const winners = tally('winners'), losers = tally('losers');

  body.innerHTML = `
    <div class="hero">
      <div class="row" style="justify-content:space-between;align-items:flex-start">
        <div style="flex:1;min-width:280px">
          <span class="verdict" style="color:${verdict[1]};background:${verdict[2]}">Economic backdrop: ${verdict[0]}</span>
          <h2>${headline(jkse, verdict[0], movers)}</h2>
          <p class="muted" style="margin:0;max-width:760px">${summary(d, movers)}</p>
        </div>
        <div class="row" style="gap:20px">
          ${[jkse && ['IHSG', jkse], lq45 && ['LQ45', lq45], eido && ['MSCI Indonesia (USD)', eido]].filter(Boolean).map(([l, x]) => `
            <div data-sym="${esc(x.symbol)}" style="cursor:pointer">
              <div class="muted small">${l}</div>
              <div class="num" style="font-size:20px;font-weight:700">${fmtPrice(x.price)}</div>
              <div class="num small"><span class="${cls(x.chg1d)}">${fmtPct(x.chg1d)}</span> today · <span class="${cls(x.chg1m)}">${fmtPct(x.chg1m, 1)}</span> 1M · <span class="${cls(x.chg1y)}">${fmtPct(x.chg1y, 1)}</span> 1Y</div>
              ${sparkline(x.spark.slice(-120), { width: 170, height: 30 })}
            </div>`).join('')}
        </div>
      </div>
    </div>

    <h2 style="font-size:15px;margin:0 0 10px">Macro snapshot <span class="muted small" style="font-weight:400">as of ${new Date(d.snapshot.asOf + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span></h2>
    <div class="grid g4" style="margin-bottom:16px">
      ${d.snapshot.items.map(m => `<div class="card macro-tile">
        <div class="lbl"><span>${esc(m.label)}</span><span class="${m.tone === 'pos' ? 'up' : m.tone === 'neg' ? 'down' : 'muted'}">${m.tone === 'pos' ? 'Supportive' : m.tone === 'neg' ? 'Headwind' : 'Neutral'}</span></div>
        <div class="val num">${esc(m.value)}</div>
        <div class="small muted">${esc(m.sub)}</div>
        <p>${esc(m.note)}</p>
        <a class="small" style="color:var(--accent-2)" href="${esc(m.source)}" target="_blank" rel="noopener">Source ↗</a>
      </div>`).join('')}
    </div>

    <div class="grid home-cols" style="margin-bottom:16px">
      <div class="card">
        <h2>What’s moving Indonesian stocks this month <span class="sub">live, 1-month change</span></h2>
        ${d.drivers.map(x => `<div class="impact">
          <div class="dot ${x.tone}">${DOT[x.tone]}</div>
          <div>
            <div class="row" style="justify-content:space-between">
              <h4 data-sym="${esc(x.symbol)}" style="cursor:pointer">${esc(x.label)}</h4>
              <span class="num small"><span class="muted">${x.points ? fmtPrice(x.price) + '%' : fmtPrice(x.price, x.currency)}</span> &nbsp;<span class="${cls(x.chg1m)}">${x.points ? (x.chg1m >= 0 ? '+' : '') + x.chg1m.toFixed(2) + ' pts' : fmtPct(x.chg1m, 1)}</span> 1M</span>
            </div>
            <p>${esc(x.text)}</p>
            ${x.winners.map(s => `<span class="sector-tag pos">▲ ${esc(s)}</span>`).join('')}${x.losers.map(s => `<span class="sector-tag neg">▼ ${esc(s)}</span>`).join('')}
          </div>
        </div>`).join('')}
      </div>
      <div class="stack">
        <div class="card">
          <h2>Who benefits, who suffers <span class="sub">from this month’s moves</span></h2>
          <div class="small muted" style="margin-bottom:4px">Tailwinds</div>
          <div>${winners.map(([s, n]) => `<span class="sector-tag pos">${esc(s)}${n > 1 ? ` ×${n}` : ''}</span>`).join('') || '<span class="muted small">None this month</span>'}</div>
          <div class="small muted" style="margin:12px 0 4px">Headwinds</div>
          <div>${losers.map(([s, n]) => `<span class="sector-tag neg">${esc(s)}${n > 1 ? ` ×${n}` : ''}</span>`).join('') || '<span class="muted small">None this month</span>'}</div>
        </div>
        <div class="card">
          <h2>What to watch next</h2>
          <ul class="small" style="margin:0;padding-left:18px;line-height:1.7;color:#c5ccd8">${d.snapshot.watch.map(w => `<li>${esc(w)}</li>`).join('')}</ul>
        </div>
        <div class="card news">
          <h2>Latest economy news <span class="sub">Google News</span></h2>
          ${d.news.length ? d.news.slice(0, 8).map(n => `<a href="${esc(n.link)}" target="_blank" rel="noopener"><b>${esc(n.title)}</b><span>${esc(n.source)}${n.date ? ' · ' + timeAgo(n.date) : ''}</span></a>`).join('') : '<div class="muted small">News feed unavailable right now.</div>'}
        </div>
      </div>
    </div>

    <div class="row" style="gap:10px;margin-bottom:16px">
      <a class="btn" href="#/market">See today’s market flow →</a>
      <a class="btn" href="#/signals">Buy / Hold / Sell signals →</a>
      <a class="btn" href="#/learn">Learn how the economy moves stocks →</a>
    </div>
    <p class="muted small">Explanations describe typical relationships, not certainties. Not financial advice.</p>`;
}

function headline(jkse, verdict, movers) {
  if (!jkse) return 'Indonesian market overview';
  const m = jkse.chg1m;
  const dir = m <= -5 ? 'under heavy pressure' : m < -1 ? 'under pressure' : m >= 5 ? 'rallying strongly' : m > 1 ? 'gaining ground' : 'moving sideways';
  return `IHSG is ${dir} (${fmtPct(m, 1)} this month)${verdict === 'Headwinds' ? ' as the macro backdrop turns tougher' : verdict === 'Tailwinds' ? ' with a supportive macro backdrop' : ''}.`;
}

function summary(d, movers) {
  const parts = movers.slice(0, 3).map(x => x.text.split('. ')[0].replace(/\.$/, ''));
  const fed = d.snapshot.items.find(x => x.key === 'fed');
  const bi = d.snapshot.items.find(x => x.key === 'bi');
  return `${parts.length ? parts.join('. ') + '. ' : 'Global drivers are fairly calm this month. '}Bank Indonesia’s rate is ${bi?.value} and the US Fed is at ${fed?.value} — the gap between the two matters for the rupiah and foreign money flows.`;
}

function timeAgo(t) {
  const h = (Date.now() - t) / 36e5;
  if (h < 1) return Math.max(1, Math.round(h * 60)) + 'm ago';
  if (h < 24) return Math.round(h) + 'h ago';
  return Math.round(h / 24) + 'd ago';
}
