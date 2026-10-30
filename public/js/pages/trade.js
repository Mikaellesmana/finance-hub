import { api, esc, flag, fmtPrice, fmtPct, fmtCompact, cls, shortSym, tvSymbol, yahooSymbol, tvWidget, goTrade } from '../util.js';

const US_QUICK = ['^GSPC', '^IXIC', 'AAPL', 'NVDA', 'MSFT', 'TSLA', 'AMZN', 'META', 'GOOGL'];
const ID_QUICK = ['^JKSE', 'BBCA.JK', 'BBRI.JK', 'BMRI.JK', 'TLKM.JK', 'ASII.JK', 'GOTO.JK', 'ADRO.JK', 'ANTM.JK'];
const OTHER_QUICK = ['IDR=X', 'GC=F', 'BTC-USD'];
const IDX_CODES = new Set(('BBCA BBRI BMRI BBNI BRIS BBTN ARTO TLKM ISAT EXCL TOWR GOTO BUKA EMTK ASII UNTR SMGR INTP UNVR ICBP INDF AMRT ' +
  'CPIN JPFA MAPI ACES KLBF SIDO MYOR HMSP GGRM ADRO AADI PTBA ITMG MEDC PGAS AKRA HRUM ANTM MDKA INCO AMMN TINS NCKL MBMA BREN TPIA ' +
  'BRPT CUAN PGEO ESSA BSDE CTRA PWON SMRA JSMR WIKA PTPP ADHI MIKA HEAL SILO ERAA MNCN SCMA').split(' '));
const WL_KEY = 'fh-watchlist';
const LAST_KEY = 'fh-last-symbol';

const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

export default function trade(el, params) {
  const symbol = params.get('s') || store.get(LAST_KEY, '^JKSE');
  store.set(LAST_KEY, symbol);
  const watch = store.get(WL_KEY, []);
  const inWatch = watch.includes(symbol);
  const chip = s => `<span class="chip ${s === symbol ? 'active' : ''}" data-sym="${esc(s)}">${esc(shortSym(s))}</span>`;

  el.innerHTML = `
    <div class="page-head">
      <div><h1>Trading View</h1><p>Live interactive charts with indicators &amp; drawing tools — US, IDX, forex, commodities, crypto.</p></div>
    </div>
    <form class="symbol-bar" id="tr-form">
      <input name="q" placeholder="Symbol: AAPL, BBCA, IDX:TLKM…" autocomplete="off">
      <button class="btn primary">Open chart</button>
      <button type="button" class="btn ${inWatch ? '' : 'ghost'}" id="tr-watch">${inWatch ? '★ In watchlist' : '☆ Add to watchlist'}</button>
    </form>
    <div class="stack" style="gap:8px;margin-bottom:16px">
      <div class="row small"><span class="muted" style="width:72px">${flag('us')} US</span><div class="chips">${US_QUICK.map(chip).join('')}</div></div>
      <div class="row small"><span class="muted" style="width:72px">${flag('id')} IDX</span><div class="chips">${ID_QUICK.map(chip).join('')}</div></div>
      <div class="row small"><span class="muted" style="width:72px">Other</span><div class="chips">${OTHER_QUICK.map(chip).join('')}</div></div>
      ${watch.length ? `<div class="row small"><span class="muted" style="width:72px">★ Watch</span><div class="chips">${watch.map(chip).join('')}</div></div>` : ''}
    </div>
    <div class="trade-layout">
      <div class="tv-chart" id="tr-chart"></div>
      <div class="stack">
        <div class="card" id="tr-quote"><div class="loading">Loading quote…</div></div>
        <div class="card" style="padding:8px"><div id="tr-ta" style="height:420px"></div></div>
      </div>
    </div>
    <p class="muted small" style="margin-top:12px">Charts by TradingView. IDX data may be delayed ~10 min; use the symbol box inside the chart to search any market.</p>`;

  el.querySelector('#tr-form').onsubmit = e => {
    e.preventDefault();
    const q = e.target.q.value.trim();
    if (!q) return;
    // A bare code is ambiguous between US and IDX; known IDX codes resolve to .JK, otherwise treat as US.
    goTrade(IDX_CODES.has(q.toUpperCase()) ? q.toUpperCase() + '.JK' : yahooSymbol(q));
  };
  el.querySelectorAll('[data-sym]').forEach(c => c.onclick = () => goTrade(c.dataset.sym));
  el.querySelector('#tr-watch').onclick = () => {
    store.set(WL_KEY, inWatch ? watch.filter(s => s !== symbol) : [...watch, symbol]);
    trade(el, params);
  };

  tvWidget(el.querySelector('#tr-chart'), 'advanced-chart', {
    autosize: true, symbol: tvSymbol(symbol), interval: 'D', timezone: 'Asia/Jakarta', theme: 'dark', style: '1',
    locale: 'en', allow_symbol_change: true, calendar: false, hide_volume: false,
    studies: ['STD;MA%Ribbon', 'STD;RSI'], backgroundColor: 'rgba(11,15,23,1)', gridColor: 'rgba(34,44,64,0.5)',
    support_host: 'https://www.tradingview.com',
  });
  tvWidget(el.querySelector('#tr-ta'), 'technical-analysis', {
    interval: '1D', width: '100%', height: '100%', isTransparent: true, symbol: tvSymbol(symbol),
    showIntervalTabs: true, displayMode: 'single', locale: 'en', colorTheme: 'dark',
  });

  loadQuote(el.querySelector('#tr-quote'), symbol);
}

async function loadQuote(box, symbol) {
  try {
    const d = await api('/api/history?symbol=' + encodeURIComponent(symbol));
    const bars = d.bars;
    const last = bars[bars.length - 1];
    const hi = Math.max(...bars.map(b => b.h ?? b.c)), lo = Math.min(...bars.map(b => b.l ?? b.c));
    const pos = hi > lo ? ((d.price - lo) / (hi - lo)) * 100 : 50;
    const ret = n => bars.length > n ? (d.price / bars[bars.length - 1 - n].c - 1) * 100 : null;
    box.innerHTML = `
      <div class="muted small">${esc(d.exchange || '')} · ${esc(d.currency || '')}</div>
      <h2 style="margin:2px 0 0">${esc(shortSym(symbol))}</h2>
      <div class="muted small" style="margin-bottom:8px">${esc(d.name)}</div>
      <div class="row" style="align-items:baseline"><span class="num" style="font-size:28px;font-weight:700">${fmtPrice(d.price, d.currency)}</span>
        <span class="num ${cls(d.change)}">${d.change > 0 ? '+' : ''}${fmtPrice(d.change, d.currency)} (${fmtPct(d.changePct)})</span></div>
      <div class="stat-list" style="margin-top:12px">
        <div class="bs-line"><span>Day range</span><span class="num">${fmtPrice(last.l, d.currency)} – ${fmtPrice(last.h, d.currency)}</span></div>
        <div class="bs-line"><span>Volume</span><span class="num">${fmtCompact(d.volume)} <span class="muted">(${d.relVolume ? d.relVolume.toFixed(1) + '× avg' : '—'})</span></span></div>
        <div class="bs-line"><span>1 month</span><span class="num ${cls(ret(21))}">${fmtPct(ret(21))}</span></div>
        <div class="bs-line"><span>3 months</span><span class="num ${cls(ret(63))}">${fmtPct(ret(63))}</span></div>
        <div class="bs-line"><span>1 year</span><span class="num ${cls(ret(bars.length - 1))}">${fmtPct(ret(bars.length - 1))}</span></div>
      </div>
      <div class="small muted" style="margin-top:12px">52-week range</div>
      <div class="range52"><div class="dot" style="left:${pos}%"></div></div>
      <div class="row small num" style="justify-content:space-between"><span>${fmtPrice(lo, d.currency)}</span><span>${fmtPrice(hi, d.currency)}</span></div>`;
  } catch (e) {
    box.innerHTML = `<div class="muted small">No quote data for ${esc(symbol)} from Yahoo — the chart may still work.</div>`;
  }
}
