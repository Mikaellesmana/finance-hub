// Finance app server: static files + market data proxy (Yahoo Finance).
// Personal finance data is kept in each visitor's browser, never on the server.
// No dependencies — requires Node 18+ (global fetch).
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const U = require('./lib/universe');
const { analyze } = require('./lib/signals');
const M = require('./lib/macro');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const CACHE_TTL = 60 * 1000;
const CACHE_MAX = 500;
const RATE_LIMIT = 120; // API requests per IP per minute
const SYMBOL_RE = /^[A-Za-z0-9.^=-]{1,20}$/;

// ---------- Yahoo Finance ----------
const cache = new Map(); // symbol -> { t, data }
const inflight = new Map();

async function fetchChart(symbol) {
  if (!SYMBOL_RE.test(symbol || '')) throw new Error(`Invalid symbol: ${symbol}`);
  const hit = cache.get(symbol);
  if (hit && Date.now() - hit.t < CACHE_TTL) return hit.data;
  if (inflight.has(symbol)) return inflight.get(symbol);

  const p = (async () => {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1y&interval=1d&includePrePost=false`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) throw new Error(`${symbol}: HTTP ${res.status}`);
    const json = await res.json();
    const r = json.chart && json.chart.result && json.chart.result[0];
    if (!r) throw new Error(`${symbol}: no data`);
    const q = r.indicators.quote[0];
    const bars = [];
    for (let i = 0; i < r.timestamp.length; i++) {
      if (q.close[i] == null) continue;
      bars.push({ t: r.timestamp[i] * 1000, o: q.open[i], h: q.high[i], l: q.low[i], c: q.close[i], v: q.volume[i] || 0 });
    }
    const m = r.meta;
    const data = { symbol, name: m.shortName || m.longName || symbol, longName: m.longName, currency: m.currency, exchange: m.fullExchangeName || m.exchangeName, price: m.regularMarketPrice, time: m.regularMarketTime * 1000, bars };
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
    cache.set(symbol, { t: Date.now(), data });
    return data;
  })().finally(() => inflight.delete(symbol));

  inflight.set(symbol, p);
  return p;
}

// Run fetches with limited concurrency; failed symbols are dropped.
async function fetchMany(symbols, limit = 8) {
  const out = new Array(symbols.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, symbols.length) }, async () => {
    while (i < symbols.length) {
      const idx = i++;
      try { out[idx] = await fetchChart(symbols[idx]); } catch (e) { console.warn('[market]', e.message); }
    }
  }));
  return out.filter(Boolean);
}

// ---------- News (Google News RSS, Indonesian economy & market) ----------
let newsCache = { t: 0, items: [] };
const NEWS_URL = 'https://news.google.com/rss/search?q=' + encodeURIComponent('(IHSG OR "Bank Indonesia" OR rupiah OR "ekonomi Indonesia" OR "Indonesia economy") when:3d') + '&hl=en-ID&gl=ID&ceid=ID:en';

const OFF_TOPIC = /\b(Asian Games|SEA Games|Olympic|athlete|football|sepak ?bola|badminton|concert|celebrity)\b/i;

async function fetchNews() {
  if (Date.now() - newsCache.t < 15 * 60 * 1000 && newsCache.items.length) return newsCache.items;
  const res = await fetch(NEWS_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();
  const decode = s => s.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
  const tag = (block, name) => { const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`)); return m ? decode(m[1]) : ''; };
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 12).map(([, b]) => {
    const source = tag(b, 'source');
    let title = tag(b, 'title');
    if (source && title.endsWith(' - ' + source)) title = title.slice(0, -(source.length + 3));
    const link = tag(b, 'link');
    return { title, source, link: /^https:\/\//.test(link) ? link : null, date: Date.parse(tag(b, 'pubDate')) || null };
  }).filter(i => i.title && i.link && !OFF_TOPIC.test(i.title));
  newsCache = { t: Date.now(), items };
  return items;
}

function quoteOf(d) {
  const bars = d.bars;
  const last = bars[bars.length - 1];
  const prevBar = bars[bars.length - 2] || last;
  // The final daily bar is the current/most recent session; previous close is the bar before it.
  const price = d.price ?? last.c;
  const prev = prevBar.c;
  const vols = bars.slice(-21, -1).map(b => b.v).filter(Boolean);
  const avgVol = vols.length ? vols.reduce((a, b) => a + b, 0) / vols.length : 0;
  return {
    symbol: d.symbol, name: d.name, currency: d.currency, exchange: d.exchange,
    price, prevClose: prev, change: price - prev, changePct: prev ? (price / prev - 1) * 100 : 0,
    volume: last.v, avgVolume: avgVol, relVolume: avgVol ? last.v / avgVol : null,
    valueTraded: last.v * price,
    time: d.time,
    spark: bars.slice(-30).map(b => b.c),
  };
}

// ---------- API ----------
async function api(req, res, url) {
  const p = url.pathname;

  if (p === '/api/quotes') {
    const symbols = (url.searchParams.get('symbols') || '').split(',').map(s => s.trim()).filter(s => SYMBOL_RE.test(s)).slice(0, 50);
    const data = await fetchMany(symbols);
    return json(res, data.map(quoteOf));
  }

  if (p === '/api/history') {
    const symbol = url.searchParams.get('symbol');
    const d = await fetchChart(symbol);
    return json(res, { ...quoteOf(d), bars: d.bars });
  }

  if (p === '/api/market') {
    const [indices, usSectors, us, id] = await Promise.all([
      fetchMany(U.INDICES.map(x => x.symbol)),
      fetchMany(U.US_SECTORS.map(x => x.symbol)),
      fetchMany(U.US_STOCKS.map(x => x.symbol)),
      fetchMany(U.ID_STOCKS.map(x => x.symbol)),
    ]);
    const label = (list, q) => ({ ...q, ...(list.find(x => x.symbol === q.symbol) || {}) });
    return json(res, {
      updated: Date.now(),
      indices: indices.map(quoteOf).map(q => label(U.INDICES, q)),
      usSectors: usSectors.map(quoteOf).map(q => label(U.US_SECTORS, q)),
      us: us.map(quoteOf).map(q => label(U.US_STOCKS, q)),
      id: id.map(quoteOf).map(q => label(U.ID_STOCKS, q)),
    });
  }

  if (p === '/api/home') {
    const [drivers, indo, news] = await Promise.all([
      fetchMany(M.DRIVERS.map(d => d.symbol)),
      fetchMany(M.INDO),
      fetchNews().catch(e => { console.warn('[news]', e.message); return []; }),
    ]);
    const change = (d, n, points) => {
      const b = d.bars, last = d.price ?? b[b.length - 1].c, then = b[Math.max(0, b.length - 1 - n)].c;
      return points ? last - then : (last / then - 1) * 100;
    };
    const live = drivers.map(d => {
      const def = M.DRIVERS.find(x => x.symbol === d.symbol);
      const points = def.unit === 'pts';
      const chg1m = change(d, 21, points);
      const moved = Math.abs(chg1m) >= def.threshold;
      const dir = chg1m >= 0 ? 'up' : 'down';
      const chgText = points ? `${Math.abs(chg1m).toFixed(2)} pts` : `${Math.abs(chg1m).toFixed(1)}%`;
      return {
        symbol: d.symbol, label: def.label, price: d.price, currency: d.currency,
        chg1d: change(d, 1, points), chg1m, points, spark: d.bars.slice(-60).map(b => b.c),
        tone: !moved ? 'neu' : def.good === 0 ? 'neu' : (chg1m > 0) === (def.good > 0) ? 'pos' : 'neg',
        moved, text: moved ? def[dir].replace('{chg}', chgText) : `Little changed this month (${chg1m >= 0 ? '+' : '−'}${chgText}) — no strong effect.`,
        winners: moved ? def.winners[dir] : [], losers: moved ? def.losers[dir] : [],
      };
    });
    return json(res, {
      updated: Date.now(),
      snapshot: M.SNAPSHOT,
      drivers: live,
      indo: indo.map(d => ({ symbol: d.symbol, name: d.name, price: d.price, chg1d: change(d, 1), chg1m: change(d, 21), chg1y: change(d, d.bars.length - 1), spark: d.bars.map(b => b.c) })),
      news,
    });
  }

  if (p === '/api/signals' && url.searchParams.has('symbols')) {
    // Score arbitrary symbols (e.g. a visitor's holdings), ranked against their home market's peers.
    const extra = [...new Set(url.searchParams.get('symbols').split(',').map(s => s.trim().toUpperCase()).filter(s => SYMBOL_RE.test(s)))].slice(0, 30);
    const groups = [
      [U.ID_STOCKS, extra.filter(s => s.endsWith('.JK'))],
      [U.US_STOCKS, extra.filter(s => !s.endsWith('.JK'))],
    ].filter(([, syms]) => syms.length);
    const rows = [];
    for (const [peers, syms] of groups) {
      const data = await fetchMany([...new Set([...peers.map(x => x.symbol), ...syms])]);
      const scored = analyze(data.map(d => ({ ...d, sector: (peers.find(x => x.symbol === d.symbol) || {}).sector })));
      rows.push(...scored.filter(r => syms.includes(r.symbol)));
    }
    return json(res, { updated: Date.now(), rows });
  }

  if (p === '/api/signals') {
    const market = url.searchParams.get('market') === 'id' ? 'id' : 'us';
    const list = market === 'id' ? U.ID_STOCKS : U.US_STOCKS;
    const data = await fetchMany(list.map(x => x.symbol));
    const rows = analyze(data.map(d => ({ ...d, sector: (list.find(x => x.symbol === d.symbol) || {}).sector })));
    return json(res, { updated: Date.now(), market, rows });
  }

  json(res, { error: 'Not found' }, 404);
}

// Simple fixed-window rate limit per client IP.
const hits = new Map();
setInterval(() => hits.clear(), 60 * 1000).unref();
function rateLimited(req) {
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress;
  const n = (hits.get(ip) || 0) + 1;
  hits.set(ip, n);
  return n > RATE_LIMIT;
}

function json(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

// ---------- Static ----------
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json' };

function serveStatic(res, pathname) {
  const file = path.normalize(path.join(PUBLIC, pathname === '/' ? 'index.html' : pathname));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(buf);
  });
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  try {
    if (url.pathname.startsWith('/api/')) {
      if (req.method !== 'GET') return json(res, { error: 'Method not allowed' }, 405);
      if (rateLimited(req)) return json(res, { error: 'Too many requests, slow down' }, 429);
      await api(req, res, url);
    }
    else serveStatic(res, decodeURIComponent(url.pathname));
  } catch (e) {
    console.error(e);
    const bad = /^Invalid symbol/.test(e.message);
    json(res, { error: bad ? e.message : 'Market data unavailable, try again shortly' }, bad ? 400 : 502);
  }
}).listen(PORT, () => console.log(`Finance app running at http://localhost:${PORT}`));
