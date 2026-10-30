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
    return {
      symbol: s.symbol, name: s.name, sector: s.sector, currency: s.currency, price,
      changePct: (price / closes[closes.length - 2] - 1) * 100,
      ret1m: ret(closes, 21), ret3m: ret(closes, 63), ret6m: ret(closes, 126), ret1y: ret(closes, closes.length - 1),
      sma20: sma(closes, 20), sma50: sma(closes, 50), sma200: sma(closes, 200),
      rsi: rsi(closes), vol: volatility(closes),
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

    return { ...r, score, rating, setup, reasons, parts: { trend, momentum: Math.round(momentum), rsi: rsiPts, risk: Math.round(risk) } };
  }).sort((a, b) => b.score - a.score);
}

module.exports = { analyze };
