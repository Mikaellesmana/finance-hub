// Rule-based stock scoring from daily price history.
// Transparent technical/quant signals only — educational, not investment advice.

const sma = (arr, n) => arr.length >= n ? arr.slice(-n).reduce((a, b) => a + b, 0) / n : null;
const ret = (closes, n) => closes.length > n ? (closes[closes.length - 1] / closes[closes.length - 1 - n] - 1) * 100 : null;

function rsi(closes, n = 14) {
  if (closes.length <= n) return null;
  let gain = 0, loss = 0;
  for (let i = 1; i <= n; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) gain += d; else loss -= d;
  }
  gain /= n; loss /= n;
  for (let i = n + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    gain = (gain * (n - 1) + Math.max(d, 0)) / n;
    loss = (loss * (n - 1) + Math.max(-d, 0)) / n;
  }
  return loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
}

function volatility(closes, n = 60) {
  const c = closes.slice(-n - 1);
  const r = [];
  for (let i = 1; i < c.length; i++) r.push(Math.log(c[i] / c[i - 1]));
  if (r.length < 2) return null;
  const m = r.reduce((a, b) => a + b, 0) / r.length;
  const v = r.reduce((a, b) => a + (b - m) ** 2, 0) / (r.length - 1);
  return Math.sqrt(v * 252) * 100;
}

// Average True Range: typical daily move, used to size buy zones, stops and targets.
function atr(bars, n = 14) {
  const tr = [];
  for (let i = 1; i < bars.length; i++) {
    const { h, l } = bars[i], pc = bars[i - 1].c;
    if (h == null || l == null) continue;
    tr.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  const last = tr.slice(-n);
  return last.length ? last.reduce((a, b) => a + b, 0) / last.length : null;
}

// Round to the exchange's valid price step (IDX / TWSE tick sizes; 1 cent elsewhere).
function tick(p, currency) {
  if (p == null || !isFinite(p)) return null;
  let t = 0.01;
  if (currency === 'IDR') t = p < 200 ? 1 : p < 500 ? 2 : p < 2000 ? 5 : p < 5000 ? 10 : 25;
  else if (currency === 'TWD') t = p < 10 ? 0.01 : p < 50 ? 0.05 : p < 100 ? 0.1 : p < 500 ? 0.5 : p < 1000 ? 1 : 5;
  return Math.round(Math.round(p / t) * t * 100) / 100;
}

// Buy / Hold / Sell call with price levels. Rules are deliberately simple and shown to users.
function action(r) {
  const a = r.atr || r.price * 0.02;
  const stretch = r.sma20 ? (r.price - r.sma20) / a : 0; // how many ATRs above the 20-day average
  const uptrend = r.sma200 && r.price > r.sma200;
  const downtrend = r.sma50 && r.sma200 && r.price < r.sma50 && r.sma50 < r.sma200;
  const T = p => tick(p, r.currency);

  let call;
  if (r.score < 35 || (downtrend && r.score < 50)) call = 'Sell';
  else if ((r.rsi ?? 50) >= 75 || stretch > 3) call = 'Take profit';
  else if (r.score >= 60 && r.sma50 && r.price > r.sma50 && stretch <= 1.5 && (r.rsi ?? 50) >= 40 && (r.rsi ?? 50) < 70) call = 'Buy';
  else if (r.score >= 55 && uptrend) call = 'Buy on dip';
  else call = 'Hold';

  const levels = {};
  if (call === 'Buy') {
    levels.entryLow = T(Math.max(r.sma20 ?? 0, r.price - a));
    levels.entryHigh = T(r.price);
  } else if (call === 'Buy on dip' || call === 'Take profit') {
    // Pullback zone: from the 20-day average (or current price, if already below it) down ~1 ATR,
    // but not below the 50-day average when that sits inside the zone.
    const high = Math.min(r.sma20 ?? r.price, r.price);
    const low = r.sma50 && r.sma50 < high ? Math.max(high - a, r.sma50) : high - a;
    levels.entryLow = T(low);
    levels.entryHigh = T(high);
  }
  const ref = levels.entryHigh != null ? (levels.entryLow + levels.entryHigh) / 2 : r.price;
  levels.stop = T(ref - 2 * a);
  levels.target1 = T(ref + 3 * a);
  levels.target2 = T(r.high52 > ref + 3 * a ? r.high52 : ref + 5 * a);
  levels.trailStop = T(Math.max(r.sma20 ?? 0, r.price - 1.5 * a)); // for protecting gains
  levels.reclaim = T(r.sma200 ?? r.sma50);                          // level that would end a downtrend
  levels.sma50 = T(r.sma50);
  levels.sma20 = T(r.sma20);
  return { call, levels, stretch };
}

// Percentile rank (0..1) of each value in the list; nulls get 0.5.
function percentiles(values) {
  const valid = values.filter(v => v != null).sort((a, b) => a - b);
  return values.map(v => {
    if (v == null || valid.length < 2) return 0.5;
    return valid.findIndex(x => x >= v) / (valid.length - 1);
  });
}

function analyze(series) {
  const base = series.filter(s => s.bars.length > 30).map(s => {
    const closes = s.bars.map(b => b.c);
    const price = s.price ?? closes[closes.length - 1];
    closes[closes.length - 1] = price;
    const high52 = Math.max(...s.bars.map(b => b.h ?? b.c));
    const low52 = Math.min(...s.bars.map(b => b.l ?? b.c));
    const atr14 = atr(s.bars);
    return {
      symbol: s.symbol, name: s.name, sector: s.sector, currency: s.currency, price,
      changePct: (price / closes[closes.length - 2] - 1) * 100,
      ret1m: ret(closes, 21), ret3m: ret(closes, 63), ret6m: ret(closes, 126), ret1y: ret(closes, closes.length - 1),
      sma20: sma(closes, 20), sma50: sma(closes, 50), sma200: sma(closes, 200),
      rsi: rsi(closes), vol: volatility(closes), atr: atr14, atrPct: atr14 ? (atr14 / price) * 100 : null,
      high52, low52, fromHigh: (price / high52 - 1) * 100,
      spark: closes.slice(-60),
    };
  });

  const momRank = percentiles(base.map(r => r.ret3m == null ? null : 0.5 * r.ret3m + 0.5 * (r.ret6m ?? r.ret3m)));
  const volRank = percentiles(base.map(r => r.vol));

  return base.map((r, i) => {
    const reasons = [];
    let trend = 0;
    if (r.sma50 && r.price > r.sma50) { trend += 10; reasons.push(['+', 'Price above 50-day average']); }
    else if (r.sma50) reasons.push(['-', 'Price below 50-day average']);
    if (r.sma200 && r.price > r.sma200) { trend += 10; reasons.push(['+', 'Price above 200-day average (long-term uptrend)']); }
    else if (r.sma200) reasons.push(['-', 'Price below 200-day average (long-term downtrend)']);
    if (r.sma50 && r.sma200 && r.sma50 > r.sma200) { trend += 10; reasons.push(['+', '50-day above 200-day ("golden cross" regime)']); }

    const momentum = momRank[i] * 35;
    if (momRank[i] >= 0.7) reasons.push(['+', `Strong relative momentum (top ${Math.round((1 - momRank[i]) * 100) || 1}% of list)`]);
    else if (momRank[i] <= 0.3) reasons.push(['-', 'Weak relative momentum vs. peers']);

    let rsiPts = 8;
    if (r.rsi != null) {
      if (r.rsi > 72) { rsiPts = 3; reasons.push(['-', `RSI ${r.rsi.toFixed(0)} — overbought, risk of pullback`]); }
      else if (r.rsi >= 45 && r.rsi <= 65) { rsiPts = 15; reasons.push(['+', `RSI ${r.rsi.toFixed(0)} — healthy, not stretched`]); }
      else if (r.rsi > 65) rsiPts = 10;
      else if (r.rsi < 30) { rsiPts = 5; reasons.push(['~', `RSI ${r.rsi.toFixed(0)} — oversold, possible bounce`]); }
    }

    let risk = (1 - volRank[i]) * 12;
    if (r.fromHigh > -10) { risk += 8; reasons.push(['+', `Within ${Math.abs(r.fromHigh).toFixed(0)}% of 52-week high`]); }
    else if (r.fromHigh > -25) risk += 4;
    else reasons.push(['-', `${Math.abs(r.fromHigh).toFixed(0)}% below 52-week high`]);

    const score = Math.round(trend + momentum + rsiPts + risk);
    const rating = score >= 70 ? 'Strong' : score >= 55 ? 'Positive' : score >= 40 ? 'Neutral' : 'Weak';

    let setup = 'Sideways';
    if (r.sma200 && r.price < r.sma200 && r.sma50 && r.sma50 < r.sma200) setup = 'Downtrend';
    else if (r.rsi != null && r.rsi < 30) setup = 'Oversold';
    else if (r.rsi != null && r.rsi > 72) setup = 'Overbought';
    else if (r.sma200 && r.price > r.sma200 && r.rsi != null && r.rsi < 45) setup = 'Pullback in uptrend';
    else if (trend >= 20 && momRank[i] >= 0.5) setup = 'Uptrend + momentum';
    else if (trend >= 20) setup = 'Uptrend';

    const out = { ...r, score, rating, setup, reasons, parts: { trend, momentum: Math.round(momentum), rsi: rsiPts, risk: Math.round(risk) } };
    return { ...out, ...action(out) };
  }).sort((a, b) => b.score - a.score);
}

module.exports = { analyze };
