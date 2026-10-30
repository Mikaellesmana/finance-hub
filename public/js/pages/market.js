import { api, esc, flag, fmtPrice, fmtPct, fmtCompact, cls, sparkline, heatColor, shortSym, goTrade } from '../util.js';

const REFRESH_MS = 60_000;

export default function market(el) {
  el.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Market Flow</h1>
        <p>US &amp; Indonesia markets at a glance — breadth, sector flow, heatmaps and movers.</p>
      </div>
      <div class="row"><span class="muted small" id="mk-updated"></span><button class="btn sm" id="mk-refresh">Refresh</button></div>
    </div>
    <div id="mk-body"><div class="loading">Loading market data…</div></div>`;

  const body = el.querySelector('#mk-body');
  let timer;

  async function load() {
    try {
      const d = await api('/api/market');
      render(body, d);
      el.querySelector('#mk-updated').textContent = 'Updated ' + new Date(d.updated).toLocaleTimeString();
    } catch (e) {
      body.innerHTML = `<div class="error">Could not load market data: ${esc(e.message)}</div>`;
    }
  }

  el.querySelector('#mk-refresh').onclick = load;
  body.addEventListener('click', e => {
    const t = e.target.closest('[data-sym]');
    if (t) goTrade(t.dataset.sym);
  });

  load();
  timer = setInterval(load, REFRESH_MS);
  return () => clearInterval(timer);
}

function render(body, d) {
  const idx = Object.fromEntries(d.indices.map(q => [q.symbol, q]));
  const usdIdr = idx['IDR=X'];

  body.innerHTML = `
    <div class="idx-grid">${d.indices.map(indexCard).join('')}</div>

    <div class="grid g2" style="margin-bottom:16px">
      ${marketPanel({ cls: 'us', flag: flag('us', 26), title: 'US Stocks', sub: 'NYSE · Nasdaq', index: idx['^GSPC'], index2: idx['^IXIC'], stocks: d.us, currency: 'USD' })}
      ${marketPanel({ cls: 'id', flag: flag('id', 26), title: 'Indonesia Stocks', sub: 'IDX · Bursa Efek Indonesia', index: idx['^JKSE'], index2: idx['^JKLQ45'], stocks: d.id, currency: 'IDR', extra: usdIdr })}
    </div>

    <div class="grid g2">
      <div class="card">
        <h2>US Sector Flow <span class="sub">Sector ETFs, today's % change</span></h2>
        ${flowBars(d.usSectors.map(s => ({ label: s.label, pct: s.changePct, sym: s.symbol })))}
      </div>
      <div class="card">
        <h2>Indonesia Sector Flow <span class="sub">Average % change of tracked stocks</span></h2>
        ${flowBars(sectorAverages(d.id))}
      </div>
    </div>`;
}

function indexCard(q) {
  const hl = q.region === 'us' || q.region === 'id';
  const f = flag(q.region);
  return `<div class="idx-card ${hl ? 'hl' : ''}" data-sym="${esc(q.symbol)}">
    <div class="lbl"><span>${f} ${esc(q.label)}</span><span class="${cls(q.changePct)} num">${fmtPct(q.changePct)}</span></div>
    <div class="px num">${fmtPrice(q.price, q.currency)}</div>
    ${sparkline(q.spark, { width: 150, height: 28 })}
  </div>`;
}

function marketPanel({ cls: c, flag, title, sub, index, index2, stocks, currency, extra }) {
  const adv = stocks.filter(s => s.changePct > 0.001).length;
  const dec = stocks.filter(s => s.changePct < -0.001).length;
  const unch = stocks.length - adv - dec;
  const total = stocks.length || 1;
  const byChange = [...stocks].sort((a, b) => b.changePct - a.changePct);
  const byValue = [...stocks].sort((a, b) => b.valueTraded - a.valueTraded);
  const unusual = [...stocks].filter(s => s.relVolume).sort((a, b) => b.relVolume - a.relVolume);

  const sectors = {};
  stocks.forEach(s => (sectors[s.sector] ||= []).push(s));

  return `<div class="card market-panel ${c}">
    <div class="mp-head">
      <h2>${flag}<span>${title}<div class="muted small" style="font-weight:400">${sub}</div></span></h2>
      <div class="mp-index" data-sym="${esc(index?.symbol)}" style="cursor:pointer">
        <div class="muted small">${esc(index?.label)}</div>
        <div class="px num">${fmtPrice(index?.price)}</div>
        <div class="${cls(index?.changePct)} num small">${fmtPct(index?.changePct)} · ${esc(index2?.label)} <span class="${cls(index2?.changePct)}">${fmtPct(index2?.changePct)}</span></div>
        ${extra ? `<div class="muted small num">USD/IDR ${fmtPrice(extra.price, 'IDR')} <span class="${cls(-extra.changePct)}">${fmtPct(extra.changePct)}</span></div>` : ''}
      </div>
    </div>

    <div class="breadth">
      <div class="row small" style="justify-content:space-between">
        <span class="up">▲ ${adv} advancing</span><span class="muted">${unch} flat</span><span class="down">${dec} declining ▼</span>
      </div>
      <div class="breadth-bar">
        <div class="a" style="width:${(adv / total) * 100}%"></div><div class="u" style="width:${(unch / total) * 100}%"></div><div class="d" style="width:${(dec / total) * 100}%"></div>
      </div>
    </div>

    <div class="heatmap">
      ${Object.entries(sectors).map(([name, list]) => {
        const avg = list.reduce((a, s) => a + s.changePct, 0) / list.length;
        return `<div class="hm-sector">
          <div class="hm-title"><span>${esc(name)}</span><span class="${cls(avg)} num">${fmtPct(avg)}</span></div>
          <div class="hm-tiles">${list.map(s => `<div class="tile" data-sym="${esc(s.symbol)}" style="background:${heatColor(s.changePct)}" title="${esc(s.name)} · ${fmtPrice(s.price, s.currency)}"><b>${esc(shortSym(s.symbol))}</b><span>${fmtPct(s.changePct)}</span></div>`).join('')}</div>
        </div>`;
      }).join('')}
    </div>

    <div class="movers">
      <div><h3>Top gainers</h3>${byChange.slice(0, 5).map(s => moverRow(s, fmtPct(s.changePct), cls(s.changePct))).join('')}</div>
      <div><h3>Top losers</h3>${byChange.slice(-5).reverse().map(s => moverRow(s, fmtPct(s.changePct), cls(s.changePct))).join('')}</div>
      <div><h3>Money flow (value traded)</h3>${byValue.slice(0, 5).map(s => moverRow(s, (currency === 'IDR' ? 'Rp ' : '$') + fmtCompact(s.valueTraded), 'muted')).join('')}</div>
    </div>
    <div style="margin-top:14px">
      <h3 class="muted small" style="font-weight:500;margin:0 0 6px">Unusual volume (vs. 20-day average)</h3>
      <div class="chips">${unusual.slice(0, 6).map(s => `<span class="chip" data-sym="${esc(s.symbol)}">${esc(shortSym(s.symbol))} <span class="num ${s.relVolume > 1.5 ? 'up' : 'muted'}">${s.relVolume.toFixed(1)}×</span> <span class="num ${cls(s.changePct)}">${fmtPct(s.changePct, 1)}</span></span>`).join('')}</div>
    </div>
  </div>`;
}

function moverRow(s, value, c) {
  return `<div class="mover" data-sym="${esc(s.symbol)}">
    <div style="min-width:0"><b>${esc(shortSym(s.symbol))}</b> <div class="nm">${esc(s.name)}</div></div>
    <div style="text-align:right"><div class="num small">${fmtPrice(s.price, s.currency)}</div><div class="num small ${c}">${value}</div></div>
  </div>`;
}

function sectorAverages(stocks) {
  const g = {};
  stocks.forEach(s => (g[s.sector] ||= []).push(s.changePct));
  return Object.entries(g).map(([label, arr]) => ({ label, pct: arr.reduce((a, b) => a + b, 0) / arr.length }));
}

function flowBars(items) {
  const sorted = [...items].sort((a, b) => b.pct - a.pct);
  const max = Math.max(1, ...sorted.map(i => Math.abs(i.pct)));
  return `<div class="flowbars">${sorted.map(i => {
    const w = (Math.abs(i.pct) / max) * 50;
    const pos = i.pct >= 0;
    return `<div class="flowbar" ${i.sym ? `data-sym="${esc(i.sym)}" style="cursor:pointer"` : ''}>
      <span>${esc(i.label)}</span>
      <div class="track"><div class="fill" style="${pos ? `left:50%` : `right:50%`};width:${w}%;background:${pos ? 'var(--up)' : 'var(--down)'}"></div></div>
      <span class="num r ${cls(i.pct)}">${fmtPct(i.pct)}</span>
    </div>`;
  }).join('')}</div>`;
}
