import { api, esc, flag, fmtMoney, fmtPrice, fmtPct, cls, uid, shortSym, goTrade, CURRENCIES, currencyLabel } from '../util.js';

const EXPENSE_CATS = ['Housing', 'Food & Dining', 'Transport', 'Utilities & Bills', 'Shopping', 'Entertainment', 'Health', 'Education', 'Family & Gifts', 'Insurance', 'Debt Payment', 'Other'];
const INCOME_CATS = ['Salary', 'Business', 'Freelance', 'Dividends', 'Interest', 'Capital Gains', 'Gift', 'Other'];
const ASSET_CATS = ['Cash & Bank', 'Deposits & Bonds', 'Mutual Funds', 'Property', 'Vehicle', 'Gold', 'Crypto', 'Retirement', 'Other'];
const LIAB_CATS = ['Mortgage', 'Vehicle Loan', 'Credit Card', 'Personal Loan', 'PayLater', 'Other'];
const PALETTE = ['#10b981', '#3b82f6', '#f59e0b', '#a855f7', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16', '#ef4444', '#06b6d4', '#8b95a8'];

const empty = () => ({ baseCurrency: 'IDR', transactions: [], holdings: [], assets: [] });

let state = null;
let prices = {};    // yahoo symbol -> quote
// Units of each currency per 1 USD (live from Yahoo; fallbacks until loaded).
let rates = { USD: 1, IDR: 16500, TWD: 32 };
let ratesLive = false;
const FX_SYMBOLS = { IDR: 'IDR=X', TWD: 'TWD=X' };
const currencyOptions = () => Object.keys(CURRENCIES).map(c => `<option value="${c}">${currencyLabel(c)}</option>`).join('');
let tab = 'overview';
const localDate = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
let month = localDate(new Date()).slice(0, 7);
let charts = [];
// Personal data lives only in this visitor's browser — never sent to the server.
const STORE_KEY = 'fh-finance';

if (window.Chart) {
  Chart.defaults.color = '#8b95a8';
  Chart.defaults.borderColor = '#222c40';
  Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
}

export default function finance(el) {
  el.innerHTML = '<div class="loading">Loading your finances…</div>';
  init(el);
  return () => { charts.forEach(c => c.destroy()); charts = []; };
}

function init(el) {
  try { state = JSON.parse(localStorage.getItem(STORE_KEY)) || empty(); }
  catch { state = empty(); }
  state = { ...empty(), ...state };
  render(el);
  refreshPrices(el);
}

function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
  catch (e) { alert('Could not save in this browser (private mode or storage blocked). Use Export to keep a copy.\n\n' + e.message); }
}

async function refreshPrices(el) {
  const syms = [...new Set(state.holdings.map(h => h.symbol)), ...Object.values(FX_SYMBOLS)];
  try {
    const quotes = await api('/api/quotes?symbols=' + encodeURIComponent(syms.join(',')));
    quotes.forEach(q => { prices[q.symbol] = q; });
    for (const [c, sym] of Object.entries(FX_SYMBOLS)) if (prices[sym]?.price) { rates[c] = prices[sym].price; ratesLive = true; }
    render(el);
  } catch (e) { console.warn(e); }
}

// ---------- Calculations ----------
const base = () => state.baseCurrency;
function toBase(amount, currency) {
  const b = base();
  if (!currency || currency === b || !rates[currency] || !rates[b]) return amount;
  return (amount / rates[currency]) * rates[b];
}
const money = (n, compact) => fmtMoney(n, base(), compact);

function holdingRows() {
  return state.holdings.map(h => {
    const q = prices[h.symbol];
    const currency = q?.currency || (/.JK$/.test(h.symbol) ? 'IDR' : /.TWO?$/.test(h.symbol) ? 'TWD' : 'USD');
    const price = q?.price ?? h.avgCost;
    const cost = h.qty * h.avgCost;
    const value = h.qty * price;
    return {
      ...h, q, currency, price, cost, value,
      pl: value - cost, plPct: cost ? (value / cost - 1) * 100 : 0,
      dayPl: q ? h.qty * q.change : 0,
      valueBase: toBase(value, currency), costBase: toBase(cost, currency),
      market: /.JK$/.test(h.symbol) ? 'Indonesia' : /.TWO?$/.test(h.symbol) ? 'Taiwan' : 'US',
    };
  });
}

function totals() {
  const hs = holdingRows();
  const invest = hs.reduce((a, h) => a + h.valueBase, 0);
  const investCost = hs.reduce((a, h) => a + h.costBase, 0);
  const other = state.assets.filter(a => a.kind === 'asset').reduce((s, a) => s + toBase(+a.value, a.currency), 0);
  const liab = state.assets.filter(a => a.kind === 'liability').reduce((s, a) => s + toBase(+a.value, a.currency), 0);
  return { hs, invest, investCost, other, assets: invest + other, liab, net: invest + other - liab };
}

function monthSummary(m) {
  const tx = state.transactions.filter(t => t.date.startsWith(m));
  const income = tx.filter(t => t.type === 'income').reduce((s, t) => s + toBase(+t.amount, t.currency), 0);
  const expense = tx.filter(t => t.type === 'expense').reduce((s, t) => s + toBase(+t.amount, t.currency), 0);
  return { tx, income, expense, net: income - expense, rate: income ? ((income - expense) / income) * 100 : null };
}

function lastMonths(n) {
  const out = [];
  const d = new Date(month + '-01T00:00:00');
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}
const monthLabel = m => new Date(m + '-01T00:00:00').toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

// ---------- Rendering ----------
function render(el) {
  charts.forEach(c => c.destroy()); charts = [];
  el.innerHTML = `
    <div class="page-head">
      <div><h1>My Finances</h1><p>Your personal financial statement — cashflow, investments, assets &amp; net worth.</p></div>
      <div class="row">
        <div class="seg" id="fx-base">${Object.keys(CURRENCIES).map(c => `<button data-c="${c}" class="${base() === c ? 'active' : ''}">${currencyLabel(c)}</button>`).join('')}</div>
        <span class="muted small num" title="Live exchange rates">${ratesLive ? `1 USD = Rp ${fmtPrice(rates.IDR, 'IDR')} · NT$ ${rates.TWD.toFixed(2)}` : 'Loading rates…'}</span>
        <button class="btn sm" id="fx-export">Export</button>
        <label class="btn sm" style="margin:0">Import<input type="file" accept=".json" id="fx-import" hidden></label>
      </div>
    </div>
    <div class="tabs">${[['overview', 'Overview'], ['cashflow', 'Cashflow'], ['investments', 'Investments'], ['assets', 'Assets & Liabilities']]
      .map(([k, l]) => `<button data-tab="${k}" class="${tab === k ? 'active' : ''}">${l}</button>`).join('')}</div>
    <div id="fx-tab"></div>`;

  el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; render(el); });
  el.querySelectorAll('#fx-base button').forEach(b => b.onclick = () => { state.baseCurrency = b.dataset.c; save(); render(el); });
  el.querySelector('#fx-export').onclick = exportJson;
  el.querySelector('#fx-import').onchange = e => importJson(e, el);

  const t = el.querySelector('#fx-tab');
  const isEmpty = !state.transactions.length && !state.holdings.length && !state.assets.length;
  if (isEmpty && tab === 'overview') return renderEmpty(t, el);
  ({ overview: renderOverview, cashflow: renderCashflow, investments: renderInvestments, assets: renderAssets })[tab](t, el);
}

function renderEmpty(t, el) {
  t.innerHTML = `<div class="empty" style="padding:48px">
    <h2 style="margin:0 0 8px;color:var(--text)">Start your financial statement</h2>
    <p>Add income &amp; expenses in <b>Cashflow</b>, your stocks in <b>Investments</b>, and savings, property or loans in <b>Assets &amp; Liabilities</b>.<br>Your data is private: it’s saved only in this browser and never uploaded. Use <b>Export</b> to back it up or move it to another device.</p>
    <div class="row" style="justify-content:center;margin-top:16px">
      <button class="btn primary" data-go="cashflow">Add first transaction</button>
      <button class="btn" id="fx-sample">Load sample data to explore</button>
    </div></div>`;
  t.querySelector('[data-go]').onclick = () => { tab = 'cashflow'; render(el); };
  t.querySelector('#fx-sample').onclick = () => { state = sampleData(); save(); refreshPrices(el); render(el); };
}

function renderOverview(t, el) {
  const T = totals();
  const ms = monthSummary(month);
  const invPl = T.invest - T.investCost;

  const groups = {};
  state.assets.filter(a => a.kind === 'asset').forEach(a => { groups[a.category] = (groups[a.category] || 0) + toBase(+a.value, a.currency); });
  T.hs.forEach(h => { const k = `Stocks (${({ US: 'US', Indonesia: 'IDX', Taiwan: 'TWSE' })[h.market]})`; groups[k] = (groups[k] || 0) + h.valueBase; });
  const liabGroups = {};
  state.assets.filter(a => a.kind === 'liability').forEach(a => { liabGroups[a.category] = (liabGroups[a.category] || 0) + toBase(+a.value, a.currency); });

  t.innerHTML = `
    <div class="grid g4" style="margin-bottom:16px">
      <div class="card kpi big"><div class="lbl">Net worth</div><div class="val num">${money(T.net, true)}</div><div class="small muted">Assets − liabilities</div></div>
      <div class="card kpi"><div class="lbl">Total assets</div><div class="val num">${money(T.assets, true)}</div><div class="small muted">incl. investments</div></div>
      <div class="card kpi"><div class="lbl">Total liabilities</div><div class="val num down">${money(T.liab, true)}</div><div class="small muted">Debt ratio ${T.assets ? ((T.liab / T.assets) * 100).toFixed(1) : 0}%</div></div>
      <div class="card kpi"><div class="lbl">Investments</div><div class="val num">${money(T.invest, true)}</div><div class="small ${cls(invPl)} num">${money(invPl, true)} (${fmtPct(T.investCost ? (invPl / T.investCost) * 100 : 0)})</div></div>
    </div>
    <div class="grid g4" style="margin-bottom:16px">
      <div class="card kpi"><div class="lbl">Income · ${monthLabel(month)}</div><div class="val num up">${money(ms.income, true)}</div></div>
      <div class="card kpi"><div class="lbl">Expenses · ${monthLabel(month)}</div><div class="val num down">${money(ms.expense, true)}</div></div>
      <div class="card kpi"><div class="lbl">Net cashflow</div><div class="val num ${cls(ms.net)}">${money(ms.net, true)}</div></div>
      <div class="card kpi"><div class="lbl">Savings rate</div><div class="val num">${ms.rate == null ? '—' : ms.rate.toFixed(0) + '%'}</div><div class="small muted">Target ≥ 20%</div></div>
    </div>
    <div class="grid g2" style="margin-bottom:16px">
      <div class="card"><h2>Cashflow — last 12 months</h2><div class="chart-box"><canvas id="c-flow"></canvas></div></div>
      <div class="card"><h2>Asset composition</h2><div class="chart-box"><canvas id="c-comp"></canvas></div></div>
    </div>
    <div class="card">
      <h2>Balance sheet <span class="sub">in ${base()}</span></h2>
      <div class="grid g2">
        <div><h3 class="small muted" style="margin:0 0 4px">ASSETS</h3>
          ${Object.entries(groups).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div class="bs-line"><span>${esc(k)}</span><span class="num">${money(v)}</span></div>`).join('') || '<div class="muted small">No assets yet</div>'}
          <div class="bs-line total"><span>Total assets</span><span class="num">${money(T.assets)}</span></div></div>
        <div><h3 class="small muted" style="margin:0 0 4px">LIABILITIES</h3>
          ${Object.entries(liabGroups).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div class="bs-line"><span>${esc(k)}</span><span class="num">${money(v)}</span></div>`).join('') || '<div class="muted small">No liabilities 🎉</div>'}
          <div class="bs-line total"><span>Total liabilities</span><span class="num">${money(T.liab)}</span></div>
          <div class="bs-line total" style="color:var(--accent)"><span>Net worth</span><span class="num">${money(T.net)}</span></div></div>
      </div>
    </div>`;

  const ms12 = lastMonths(12).map(m => ({ m, ...monthSummary(m) }));
  charts.push(new Chart(t.querySelector('#c-flow'), {
    data: {
      labels: ms12.map(x => monthLabel(x.m)),
      datasets: [
        { type: 'bar', label: 'Income', data: ms12.map(x => x.income), backgroundColor: '#22c55e', borderRadius: 4 },
        { type: 'bar', label: 'Expenses', data: ms12.map(x => x.expense), backgroundColor: '#ef4444', borderRadius: 4 },
        { type: 'line', label: 'Net', data: ms12.map(x => x.net), borderColor: '#3b82f6', backgroundColor: '#3b82f6', tension: .3, pointRadius: 3 },
      ],
    },
    options: { maintainAspectRatio: false, plugins: { tooltip: { callbacks: { label: c => `${c.dataset.label}: ${money(c.raw)}` } } }, scales: { y: { ticks: { callback: v => money(v, true) } } } },
  }));
  doughnut(t.querySelector('#c-comp'), groups);
}

function doughnut(canvas, map) {
  const entries = Object.entries(map).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  if (!entries.length) { canvas.parentElement.innerHTML = '<div class="empty">Nothing to chart yet</div>'; return; }
  charts.push(new Chart(canvas, {
    type: 'doughnut',
    data: { labels: entries.map(e => e[0]), datasets: [{ data: entries.map(e => e[1]), backgroundColor: PALETTE, borderColor: '#121826', borderWidth: 2 }] },
    options: {
      maintainAspectRatio: false, cutout: '62%',
      plugins: {
        legend: { position: 'right', labels: { boxWidth: 12, padding: 10 } },
        tooltip: { callbacks: { label: c => { const tot = c.dataset.data.reduce((a, b) => a + b, 0); return `${c.label}: ${money(c.raw, true)} (${((c.raw / tot) * 100).toFixed(1)}%)`; } } },
      },
    },
  }));
}

function renderCashflow(t, el) {
  const ms = monthSummary(month);
  const byCat = {};
  ms.tx.filter(x => x.type === 'expense').forEach(x => { byCat[x.category] = (byCat[x.category] || 0) + toBase(+x.amount, x.currency); });
  const today = localDate(new Date());

  t.innerHTML = `
    <div class="card" style="margin-bottom:16px">
      <h2>Add transaction</h2>
      <form class="form-row" id="tx-form">
        <label class="field">Type<select name="type"><option value="expense">Expense</option><option value="income">Income</option></select></label>
        <label class="field">Date<input type="date" name="date" value="${month === today.slice(0, 7) ? today : month + '-01'}" required></label>
        <label class="field">Category<select name="category">${EXPENSE_CATS.map(c => `<option>${c}</option>`).join('')}</select></label>
        <label class="field">Amount<input type="number" name="amount" min="0" step="any" placeholder="0" required></label>
        <label class="field">Currency<select name="currency">${currencyOptions()}</select></label>
        <label class="field">Note<input name="note" placeholder="optional"></label>
        <button class="btn primary">Add</button>
      </form>
    </div>
    <div class="row" style="margin-bottom:16px">
      <button class="btn sm" id="m-prev">‹</button><input type="month" id="m-pick" value="${month}"><button class="btn sm" id="m-next">›</button>
      <span class="muted small" style="margin-left:8px">Income <b class="up num">${money(ms.income)}</b> · Expenses <b class="down num">${money(ms.expense)}</b> · Net <b class="num ${cls(ms.net)}">${money(ms.net)}</b>${ms.rate != null ? ` · Savings rate <b>${ms.rate.toFixed(0)}%</b>` : ''}</span>
    </div>
    <div class="grid" style="grid-template-columns:minmax(0,1.6fr) minmax(0,1fr)">
      <div class="card"><h2>Transactions <span class="sub">${ms.tx.length} in ${monthLabel(month)}</span></h2>
        ${ms.tx.length ? `<div class="table-wrap"><table><thead><tr><th>Date</th><th>Category</th><th>Note</th><th class="r">Amount</th><th></th></tr></thead><tbody>
          ${[...ms.tx].sort((a, b) => b.date.localeCompare(a.date)).map(x => `<tr>
            <td class="num small">${x.date}</td><td>${esc(x.category)}</td><td class="muted">${esc(x.note)}</td>
            <td class="r num ${x.type === 'income' ? 'up' : 'down'}">${x.type === 'income' ? '+' : '−'}${fmtMoney(+x.amount, x.currency)}</td>
            <td class="r"><button class="icon-btn" data-del="${x.id}" title="Delete">✕</button></td></tr>`).join('')}
        </tbody></table></div>` : '<div class="empty">No transactions this month</div>'}
      </div>
      <div class="card"><h2>Spending by category</h2><div class="chart-box sm"><canvas id="c-cat"></canvas></div></div>
    </div>`;

  const form = t.querySelector('#tx-form');
  form.type.onchange = () => { form.category.innerHTML = (form.type.value === 'income' ? INCOME_CATS : EXPENSE_CATS).map(c => `<option>${c}</option>`).join(''); };
  form.onsubmit = e => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(form));
    state.transactions.push({ id: uid(), ...f, amount: +f.amount });
    month = f.date.slice(0, 7);
    save(); render(el);
  };
  const shift = n => { const d = new Date(month + '-01T00:00:00'); d.setMonth(d.getMonth() + n); month = localDate(d).slice(0, 7); render(el); };
  t.querySelector('#m-prev').onclick = () => shift(-1);
  t.querySelector('#m-next').onclick = () => shift(1);
  t.querySelector('#m-pick').onchange = e => { month = e.target.value || month; render(el); };
  t.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { state.transactions = state.transactions.filter(x => x.id !== b.dataset.del); save(); render(el); });
  doughnut(t.querySelector('#c-cat'), byCat);
}

function renderInvestments(t, el) {
  const hs = holdingRows();
  const tot = hs.reduce((a, h) => a + h.valueBase, 0);
  const cost = hs.reduce((a, h) => a + h.costBase, 0);
  const day = hs.reduce((a, h) => a + toBase(h.dayPl, h.currency), 0);
  const alloc = {}; hs.forEach(h => { alloc[shortSym(h.symbol)] = h.valueBase; });
  const byMarket = {}; hs.forEach(h => { byMarket[h.market] = (byMarket[h.market] || 0) + h.valueBase; });

  t.innerHTML = `
    <div class="grid g4" style="margin-bottom:16px">
      <div class="card kpi big"><div class="lbl">Portfolio value</div><div class="val num">${money(tot, true)}</div></div>
      <div class="card kpi"><div class="lbl">Total gain / loss</div><div class="val num ${cls(tot - cost)}">${money(tot - cost, true)}</div><div class="small num ${cls(tot - cost)}">${fmtPct(cost ? (tot / cost - 1) * 100 : 0)}</div></div>
      <div class="card kpi"><div class="lbl">Today</div><div class="val num ${cls(day)}">${money(day, true)}</div></div>
      <div class="card kpi"><div class="lbl">By market</div><div class="val num" style="font-size:18px">${Object.entries(byMarket).map(([m, v]) => `${flag(({ US: 'us', Indonesia: 'id', Taiwan: 'tw' })[m], 14)} ${Math.round((v / (tot || 1)) * 100)}%`).join(' &nbsp;') || '—'}</div></div>
    </div>
    <div class="card" style="margin-bottom:16px">
      <h2>Add holding <span class="sub">IDX: BBCA.JK (1 lot = 100 shares) · US: AAPL · Taiwan: 2330.TW (1 lot = 1,000 shares)</span></h2>
      <form class="form-row" id="h-form">
        <label class="field">Symbol<input name="symbol" placeholder="BBCA.JK, AAPL, 2330.TW" required></label>
        <label class="field">Shares<input type="number" name="qty" min="0" step="any" required></label>
        <label class="field">Avg cost / share<input type="number" name="avgCost" min="0" step="any" required></label>
        <label class="field">Note<input name="note" placeholder="optional"></label>
        <button class="btn primary">Add</button>
      </form>
    </div>
    <div class="grid" style="grid-template-columns:minmax(0,1.8fr) minmax(0,1fr)">
      <div class="card"><h2>Holdings <button class="btn sm" id="h-refresh">Refresh prices</button></h2>
        ${hs.length ? `<div class="table-wrap"><table><thead><tr><th>Symbol</th><th class="r">Shares</th><th class="r">Avg cost</th><th class="r">Price</th><th class="r">Day</th><th class="r">Value</th><th class="r">P/L</th><th class="r">Weight</th><th></th></tr></thead><tbody>
          ${hs.map(h => `<tr class="click" data-sym="${esc(h.symbol)}">
            <td><b>${esc(shortSym(h.symbol))}</b> <span class="muted small">${flag(({ US: 'us', Indonesia: 'id', Taiwan: 'tw' })[h.market], 14)}</span><div class="muted small">${esc(h.q?.name || h.note || '')}</div></td>
            <td class="r num">${h.qty.toLocaleString()}</td>
            <td class="r num">${fmtPrice(h.avgCost, h.currency)}</td>
            <td class="r num">${fmtPrice(h.price, h.currency)}</td>
            <td class="r num ${cls(h.q?.changePct)}">${fmtPct(h.q?.changePct)}</td>
            <td class="r num">${fmtMoney(h.value, h.currency, true)}</td>
            <td class="r num ${cls(h.pl)}">${fmtMoney(h.pl, h.currency, true)}<div class="small">${fmtPct(h.plPct)}</div></td>
            <td class="r num">${tot ? ((h.valueBase / tot) * 100).toFixed(1) : 0}%</td>
            <td class="r"><button class="icon-btn" data-del="${h.id}" title="Delete">✕</button></td></tr>`).join('')}
        </tbody></table></div>` : '<div class="empty">No holdings yet</div>'}
      </div>
      <div class="card"><h2>Allocation</h2><div class="chart-box sm"><canvas id="c-alloc"></canvas></div></div>
    </div>`;

  const form = t.querySelector('#h-form');
  form.onsubmit = e => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(form));
    state.holdings.push({ id: uid(), symbol: f.symbol.trim().toUpperCase(), qty: +f.qty, avgCost: +f.avgCost, note: f.note });
    save(); render(el); refreshPrices(el);
  };
  t.querySelector('#h-refresh').onclick = () => refreshPrices(el);
  t.querySelectorAll('[data-del]').forEach(b => b.onclick = e => { e.stopPropagation(); state.holdings = state.holdings.filter(x => x.id !== b.dataset.del); save(); render(el); });
  t.querySelectorAll('tr[data-sym]').forEach(r => r.onclick = () => goTrade(r.dataset.sym));
  doughnut(t.querySelector('#c-alloc'), alloc);
}

function renderAssets(t, el) {
  const list = kind => state.assets.filter(a => a.kind === kind);
  const sum = kind => list(kind).reduce((s, a) => s + toBase(+a.value, a.currency), 0);
  const table = kind => list(kind).length ? `<table><tbody>${list(kind).map(a => `<tr>
      <td><b>${esc(a.name)}</b><div class="muted small">${esc(a.category)}</div></td>
      <td class="r num">${fmtMoney(+a.value, a.currency)}</td>
      <td class="r"><button class="btn sm ghost" data-edit="${a.id}">Update</button><button class="icon-btn" data-del="${a.id}" title="Delete">✕</button></td></tr>`).join('')}</tbody></table>`
    : `<div class="empty">None yet</div>`;

  t.innerHTML = `
    <div class="card" style="margin-bottom:16px">
      <h2>Add asset or liability <span class="sub">Stocks go in Investments — they’re priced live</span></h2>
      <form class="form-row" id="a-form">
        <label class="field">Kind<select name="kind"><option value="asset">Asset</option><option value="liability">Liability</option></select></label>
        <label class="field">Name<input name="name" placeholder="e.g. BCA savings" required></label>
        <label class="field">Category<select name="category">${ASSET_CATS.map(c => `<option>${c}</option>`).join('')}</select></label>
        <label class="field">Current value<input type="number" name="value" min="0" step="any" required></label>
        <label class="field">Currency<select name="currency">${currencyOptions()}</select></label>
        <button class="btn primary">Add</button>
      </form>
    </div>
    <div class="grid g2">
      <div class="card"><h2>Assets <span class="num up">${money(sum('asset'))}</span></h2>${table('asset')}</div>
      <div class="card"><h2>Liabilities <span class="num down">${money(sum('liability'))}</span></h2>${table('liability')}</div>
    </div>
    <div class="row" style="margin-top:24px;justify-content:flex-end">
      <button class="btn sm danger" id="fx-clear">Clear all my data</button>
    </div>`;

  const form = t.querySelector('#a-form');
  form.kind.onchange = () => { form.category.innerHTML = (form.kind.value === 'asset' ? ASSET_CATS : LIAB_CATS).map(c => `<option>${c}</option>`).join(''); };
  form.onsubmit = e => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(form));
    state.assets.push({ id: uid(), ...f, value: +f.value });
    save(); render(el);
  };
  t.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { state.assets = state.assets.filter(x => x.id !== b.dataset.del); save(); render(el); });
  t.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => {
    const a = state.assets.find(x => x.id === b.dataset.edit);
    const v = prompt(`New value for "${a.name}" (${currencyLabel(a.currency)})`, a.value);
    if (v != null && !isNaN(+v)) { a.value = +v; save(); render(el); }
  });
  t.querySelector('#fx-clear').onclick = () => {
    if (confirm('Delete ALL transactions, holdings and assets? Export first if you want a backup.')) { state = empty(); save(); tab = 'overview'; render(el); }
  };
}

// ---------- Import / export ----------
function exportJson() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `finance-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
}

function importJson(e, el) {
  const file = e.target.files[0];
  if (!file) return;
  file.text().then(txt => {
    const d = JSON.parse(txt);
    if (!Array.isArray(d.transactions) || !Array.isArray(d.holdings) || !Array.isArray(d.assets)) throw new Error('Not a Finance Hub export');
    state = { ...empty(), ...d }; save(); render(el); refreshPrices(el);
  }).catch(err => alert('Import failed: ' + err.message));
}

function sampleData() {
  const tx = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const add = (day, type, category, amount, note) => tx.push({ id: uid(), date: `${ym}-${String(day).padStart(2, '0')}`, type, category, amount, currency: 'IDR', note });
    add(1, 'income', 'Salary', 18_000_000, 'Monthly salary');
    if (i % 2 === 0) add(15, 'income', 'Freelance', 3_500_000, 'Side project');
    add(2, 'expense', 'Housing', 4_500_000, 'Rent');
    add(5, 'expense', 'Utilities & Bills', 850_000 + i * 20_000, 'PLN, internet, phone');
    add(8, 'expense', 'Food & Dining', 3_200_000 + (i % 3) * 300_000, 'Groceries & eating out');
    add(10, 'expense', 'Transport', 1_100_000, 'Fuel, Gojek, toll');
    add(18, 'expense', 'Entertainment', 600_000 + (i % 2) * 400_000, 'Movies, subscriptions');
    add(20, 'expense', 'Shopping', 900_000 + (i % 4) * 250_000, '');
    add(25, 'expense', 'Insurance', 750_000, 'Health insurance');
    add(28, 'expense', 'Debt Payment', 2_400_000, 'Car loan installment');
  }
  return {
    baseCurrency: 'IDR',
    transactions: tx,
    holdings: [
      { id: uid(), symbol: 'BBCA.JK', qty: 2000, avgCost: 8900, note: '' },
      { id: uid(), symbol: 'BBRI.JK', qty: 3000, avgCost: 4300, note: '' },
      { id: uid(), symbol: 'TLKM.JK', qty: 2500, avgCost: 3100, note: '' },
      { id: uid(), symbol: 'AAPL', qty: 10, avgCost: 190, note: '' },
      { id: uid(), symbol: 'NVDA', qty: 15, avgCost: 120, note: '' },
    ],
    assets: [
      { id: uid(), kind: 'asset', name: 'BCA savings', category: 'Cash & Bank', value: 45_000_000, currency: 'IDR' },
      { id: uid(), kind: 'asset', name: 'Emergency fund (deposito)', category: 'Deposits & Bonds', value: 60_000_000, currency: 'IDR' },
      { id: uid(), kind: 'asset', name: 'Reksa dana pasar uang', category: 'Mutual Funds', value: 25_000_000, currency: 'IDR' },
      { id: uid(), kind: 'asset', name: 'Antam gold 20g', category: 'Gold', value: 40_000_000, currency: 'IDR' },
      { id: uid(), kind: 'asset', name: 'Car', category: 'Vehicle', value: 210_000_000, currency: 'IDR' },
      { id: uid(), kind: 'liability', name: 'Car loan', category: 'Vehicle Loan', value: 72_000_000, currency: 'IDR' },
      { id: uid(), kind: 'liability', name: 'Credit card', category: 'Credit Card', value: 4_500_000, currency: 'IDR' },
    ],
  };
}
