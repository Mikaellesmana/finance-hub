// Shared helpers.

export async function api(path, opts) {
  const res = await fetch(path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function fmtNum(n, digits = 2) {
  if (n == null || isNaN(n)) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function fmtPrice(n, currency) {
  if (n == null || isNaN(n)) return '—';
  if (currency === 'IDR') return fmtNum(n, Math.abs(n) < 10 ? 2 : 0);
  return fmtNum(n, Math.abs(n) < 10 ? 3 : 2);
}

// Supported money currencies. TWD is shown to users as "NTD".
export const CURRENCIES = { IDR: { prefix: 'Rp ', label: 'IDR', digits: 0 }, USD: { prefix: '$', label: 'USD', digits: 2 }, TWD: { prefix: 'NT$ ', label: 'NTD', digits: 0 } };
export const currencyLabel = c => CURRENCIES[c]?.label || c;

export function fmtMoney(n, currency = 'IDR', compact = false) {
  if (n == null || isNaN(n)) return '—';
  const c = CURRENCIES[currency] || { prefix: currency + ' ', digits: 2 };
  const sign = n < 0 ? '−' : '';
  const a = Math.abs(n);
  if (compact && a >= 1e12) return `${sign}${c.prefix}${(a / 1e12).toFixed(2)}T`;
  if (compact && a >= 1e9) return `${sign}${c.prefix}${(a / 1e9).toFixed(2)}B`;
  if (compact && a >= 1e6) return `${sign}${c.prefix}${(a / 1e6).toFixed(currency === 'USD' ? 2 : 1)}M`;
  return `${sign}${c.prefix}${a.toLocaleString('en-US', { minimumFractionDigits: c.digits, maximumFractionDigits: c.digits })}`;
}

export function fmtPct(n, digits = 2) {
  if (n == null || isNaN(n)) return '—';
  return `${n > 0 ? '+' : ''}${n.toFixed(digits)}%`;
}

export function fmtCompact(n) {
  if (n == null || isNaN(n)) return '—';
  return Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

export const cls = n => (n > 0 ? 'up' : n < 0 ? 'down' : 'muted');

export function sparkline(values, { width = 100, height = 30, color } = {}) {
  if (!values || values.length < 2) return '';
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * width},${height - 2 - ((v - min) / range) * (height - 4)}`).join(' ');
  const c = color || (values[values.length - 1] >= values[0] ? 'var(--up)' : 'var(--down)');
  return `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="${c}" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
}

// Heatmap colour for a % change, saturating at ±3%.
export function heatColor(pct) {
  const t = Math.min(Math.abs(pct || 0) / 3, 1);
  if (Math.abs(pct) < 0.05) return 'rgb(55,63,80)';
  const [r, g, b] = pct > 0 ? [22, 163, 74] : [220, 38, 38];
  const base = [40, 46, 60];
  const mix = (a, z) => Math.round(a + (z - a) * (0.35 + 0.65 * t));
  return `rgb(${mix(base[0], r)},${mix(base[1], g)},${mix(base[2], b)})`;
}

// Small inline flags (Windows doesn't render flag emoji).
export function flag(code, size = 16) {
  const h = Math.round(size * 0.7);
  if (code === 'id') return `<svg class="flag" width="${size}" height="${h}" viewBox="0 0 3 2"><rect width="3" height="1" fill="#e11d48"/><rect y="1" width="3" height="1" fill="#f1f5f9"/></svg>`;
  if (code === 'tw') return `<svg class="flag" width="${size}" height="${h}" viewBox="0 0 3 2"><rect width="3" height="2" fill="#dc2626"/><rect width="1.5" height="1" fill="#1e3a8a"/><circle cx=".75" cy=".5" r=".22" fill="#f1f5f9"/></svg>`;
  if (code === 'us') return `<svg class="flag" width="${size}" height="${h}" viewBox="0 0 19 13"><rect width="19" height="13" fill="#f1f5f9"/>${[0, 2, 4, 6, 8, 10, 12].map(y => `<rect y="${y}" width="19" height="1" fill="#dc2626"/>`).join('')}<rect width="8" height="7" fill="#1e3a8a"/></svg>`;
  return '';
}

export const shortSym = s => s.replace(/\.(JK|TWO?)$/, '').replace(/^\^/, '');

// Yahoo ticker -> TradingView symbol.
const TV_MAP = {
  // Exchange index feeds are blocked in free widgets, so US indices use FOREXCOM's index CFDs.
  '^GSPC': 'FOREXCOM:SPXUSD', '^IXIC': 'FOREXCOM:NSXUSD', '^DJI': 'FOREXCOM:DJI', '^RUT': 'FOREXCOM:US2000', '^VIX': 'TVC:VIX',
  '^JKSE': 'IDX:COMPOSITE', '^JKLQ45': 'IDX:LQ45', 'IDR=X': 'FX_IDC:USDIDR', '^TNX': 'TVC:US10Y',
  'GC=F': 'TVC:GOLD', 'CL=F': 'TVC:USOIL', 'BTC-USD': 'BITSTAMP:BTCUSD',
};
export function tvSymbol(y) {
  if (!y) return 'IDX:COMPOSITE';
  if (y.includes(':')) return y.toUpperCase();
  if (TV_MAP[y]) return TV_MAP[y];
  if (/\.JK$/i.test(y)) return 'IDX:' + y.replace(/\.JK$/i, '').toUpperCase();
  if (/\.TW$/i.test(y)) return 'TWSE:' + y.replace(/\.TW$/i, '').toUpperCase();
  if (/\.TWO$/i.test(y)) return 'TPEX:' + y.replace(/\.TWO$/i, '').toUpperCase();
  return y.toUpperCase().replace('-', '.');
}
// TradingView / user input -> Yahoo ticker.
export function yahooSymbol(s) {
  s = s.trim().toUpperCase();
  const rev = Object.entries(TV_MAP).find(([, tv]) => tv === s);
  if (rev) return rev[0];
  if (s.startsWith('IDX:')) return s.slice(4) + '.JK';
  if (s.startsWith('TWSE:')) return s.slice(5) + '.TW';
  if (s.startsWith('TPEX:')) return s.slice(5) + '.TWO';
  if (s.includes(':')) s = s.split(':')[1];
  return s.replace(/\.([A-Z])$/, '-$1'); // class shares: BRK.B -> BRK-B
}

// Embed a TradingView widget into `el`.
export function tvWidget(el, name, config) {
  el.innerHTML = '<div class="tradingview-widget-container" style="height:100%;width:100%"><div class="tradingview-widget-container__widget" style="height:100%;width:100%"></div></div>';
  const s = document.createElement('script');
  s.src = `https://s3.tradingview.com/external-embedding/embed-widget-${name}.js`;
  s.async = true;
  s.innerHTML = JSON.stringify(config);
  el.firstChild.appendChild(s);
}

export const uid = () => Math.random().toString(36).slice(2, 10);

export function goTrade(symbol) { location.hash = `#/trade?s=${encodeURIComponent(symbol)}`; }
