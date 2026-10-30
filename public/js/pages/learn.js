import { esc, fmtMoney, fmtNum, CURRENCIES, currencyLabel } from '../util.js';

const LESSONS = [
  {
    id: 'start', title: 'Investing basics', level: 'Beginner',
    html: `
      <p>A <b>stock</b> (saham) is a small ownership share of a company. You make money when the share price rises (capital gain) and when the company pays part of its profit as <b>dividends</b>. You lose money when the price falls — and prices can fall a lot.</p>
      <details><summary>Indonesian stocks (IDX) vs. US stocks</summary>
        <ul>
          <li><b>IDX</b> (Bursa Efek Indonesia): traded in rupiah, in <b>lots of 100 shares</b>. Trading runs roughly 09:00–16:00 WIB with a lunch break (longer on Fridays). Main indices: <b>IHSG</b> (all stocks), <b>LQ45</b> and <b>IDX30</b> (large, liquid stocks).</li>
          <li><b>US</b> (NYSE, Nasdaq): traded in US dollars, usually in single shares or fractions. Open about 20:30–03:00 WIB (21:30–04:00 when the US is on winter time). Main indices: <b>S&amp;P 500</b>, <b>Nasdaq</b>, <b>Dow Jones</b>.</li>
          <li>Owning both spreads your risk across two economies and two currencies.</li>
        </ul>
      </details>
      <details><summary>How to start buying stocks in Indonesia</summary>
        <ol>
          <li>Choose a securities broker (sekuritas) licensed by <b>OJK</b> — always check the licence on the OJK website.</li>
          <li>Open an account online with your KTP and NPWP (if you have one). You get a <b>SID</b> (investor ID) and an <b>RDN</b> — a bank account in your name that holds your trading cash.</li>
          <li>Transfer money into the RDN, search the stock code (e.g. BBCA) and place a buy order for 1 lot or more.</li>
          <li>US stocks are available through some licensed brokers and apps; check fees, FX spreads and how your shares are held.</li>
        </ol>
      </details>
      <div class="tip">Start small. Your first goal is to learn how prices move and how you react to losses — not to get rich fast.</div>`,
  },
  {
    id: 'foundation', title: 'Personal finance comes first', level: 'Beginner',
    html: `
      <p>Investing only works if your finances can survive bad years. Before buying stocks:</p>
      <ul>
        <li><b>Emergency fund:</b> 3–6 months of expenses in a savings account, deposit or money-market fund (6–12 months if your income is irregular).</li>
        <li><b>Kill expensive debt:</b> credit cards, PayLater and online loans often cost far more than stocks can reliably earn.</li>
        <li><b>Budget:</b> a common rule is <b>50 / 30 / 20</b> — 50% needs, 30% wants, 20% saving and investing. Aim for a savings rate of at least 20%.</li>
        <li><b>Insurance:</b> health insurance (e.g. BPJS Kesehatan) so a hospital bill doesn’t force you to sell investments at a loss.</li>
        <li><b>Time horizon:</b> only put money in stocks that you won’t need for about 5 years.</li>
      </ul>
      <div class="tip">Track all of this in <a href="#/finance" style="color:var(--accent)">My Finances</a> — your savings rate and net worth are calculated for you.</div>`,
  },
  {
    id: 'charts', title: 'Reading a price chart', level: 'Intermediate',
    html: `
      <details open><summary>Candlesticks</summary>
        <p>Each candle shows one period (e.g. one day): the <b>open</b>, <b>high</b>, <b>low</b> and <b>close</b>. Green = closed higher than it opened, red = closed lower. Long wicks show prices that were reached but rejected.</p>
      </details>
      <details><summary>Volume</summary>
        <p>How many shares traded. Price moves on <b>high volume</b> are more meaningful than moves on thin volume. The Market Flow page flags <b>unusual volume</b> (more than 1.5× the 20-day average).</p>
      </details>
      <details><summary>Moving averages (MA 20 / 50 / 200)</summary>
        <p>The average closing price of the last 20, 50 or 200 days. Price above a rising 200-day MA = long-term <b>uptrend</b>; below a falling one = <b>downtrend</b>. The 50-day crossing above the 200-day is called a <b>golden cross</b>; crossing below is a <b>death cross</b>.</p>
      </details>
      <details><summary>RSI (Relative Strength Index)</summary>
        <p>A 0–100 gauge of recent buying vs. selling pressure. Above 70 = <b>overbought</b> (may cool off); below 30 = <b>oversold</b> (may bounce). In strong trends RSI can stay extreme for a long time, so use it with the trend, not against it.</p>
      </details>
      <details><summary>Support, resistance and ATR</summary>
        <p><b>Support</b> is a price area where buyers stepped in before; <b>resistance</b> is where sellers did. <b>ATR</b> (Average True Range) is the stock’s typical daily move — this app uses it to set buy zones, stop-losses and targets.</p>
      </details>
      <div class="tip">Practise on the <a href="#/trade" style="color:var(--accent)">Trading View</a> page — it shows the MA ribbon and RSI by default.</div>`,
  },
  {
    id: 'fundamentals', title: 'Is the company good? (fundamentals)', level: 'Intermediate',
    html: `
      <p>Charts tell you <i>when</i>; fundamentals tell you <i>what</i> to own. Key ratios (find them in annual reports, IDX website or your broker app):</p>
      <ul>
        <li><b>EPS</b> — earnings per share. You want it growing over several years.</li>
        <li><b>PER</b> (Price / Earnings) — how many years of profit you pay for. Compare with the company’s own history and its sector, not with other sectors.</li>
        <li><b>PBV</b> (Price / Book) — price vs. net assets. Common for valuing <b>banks</b>.</li>
        <li><b>ROE</b> — profit as % of shareholders’ equity. Consistently above ~15% is strong.</li>
        <li><b>DER</b> (Debt / Equity) — how much the company borrows. High debt is riskier when interest rates rise.</li>
        <li><b>Dividend yield</b> — yearly dividend ÷ price. High yield is nice, but check the dividend is sustainable.</li>
      </ul>
      <div class="tip">A great company can still be a bad investment if you pay too much for it. A cheap stock can be cheap for a reason.</div>`,
  },
  {
    id: 'economy', title: 'How the economy moves stocks', level: 'Intermediate',
    html: `
      <ul>
        <li><b>Interest rates (BI-Rate):</b> higher rates make loans pricier and deposits more attractive, which usually weighs on stocks — especially property, autos and fast-growing companies.</li>
        <li><b>US rates (the Fed) and US bond yields:</b> when US yields rise, global money tends to leave emerging markets like Indonesia, and the rupiah weakens.</li>
        <li><b>The rupiah:</b> a weaker rupiah hurts importers and companies with US-dollar debt, but helps exporters (coal, nickel, palm oil) that earn dollars.</li>
        <li><b>Inflation:</b> rising prices squeeze household spending and can force Bank Indonesia to raise rates.</li>
        <li><b>Commodities:</b> coal, nickel, copper, gold, oil and CPO are huge for Indonesia — their prices move whole IDX sectors.</li>
        <li><b>China:</b> Indonesia’s largest trading partner; Chinese demand drives commodity prices.</li>
        <li><b>Foreign flows:</b> foreign investors own a large share of big IDX stocks; when they sell, IHSG often falls even if local news is fine.</li>
      </ul>
      <div class="tip">See all of these live on the <a href="#/home" style="color:var(--accent)">Home</a> page.</div>`,
  },
  {
    id: 'risk', title: 'Risk management: how not to blow up', level: 'Essential',
    html: `
      <ul>
        <li><b>Position size:</b> decide how much you’re willing to lose on one trade — many traders use 1–2% of their total portfolio. Use the calculator below.</li>
        <li><b>Always know your stop-loss</b> before you buy: the price where you admit you were wrong and sell.</li>
        <li><b>Diversify:</b> several sectors, both IDX and US, plus bonds (e.g. government ORI / SBR) and cash.</li>
        <li><b>Don’t keep averaging down</b> on a stock in a downtrend — that’s how small losses become big ones.</li>
        <li><b>Beware “saham gorengan”:</b> small, illiquid stocks pumped on social media. They can rise fast and crash faster, and you may not be able to sell.</li>
        <li><b>Don’t invest borrowed money</b> or money you need soon.</li>
      </ul>`,
  },
  {
    id: 'signals', title: 'Using Buy / Hold / Sell signals', level: 'Intermediate',
    html: `
      <p>The <a href="#/signals" style="color:var(--accent)">Stock Ideas</a> page gives every stock a score and a signal based only on price trends. Use it like this:</p>
      <ol>
        <li>Use <b>Buy</b> / <b>Buy on dip</b> signals as a <b>shortlist</b>, then check the fundamentals of those companies.</li>
        <li>Buy only inside the <b>buy zone</b> — don’t chase a price that has already run up.</li>
        <li>Set your <b>stop-loss</b> immediately and respect it.</li>
        <li>Take some profit at <b>Target 1</b>, and move your stop up to protect the rest.</li>
        <li><b>Take profit</b> means “overheated”, not “the company is bad”. <b>Sell</b> means the trend is down — avoid new buys.</li>
      </ol>
      <div class="tip">Signals are rules, not predictions. They will often be wrong — the stop-loss is what keeps a wrong signal small.</div>`,
  },
  {
    id: 'costs', title: 'Fees and taxes (Indonesia)', level: 'Beginner',
    html: `
      <ul>
        <li><b>Broker fees</b> on IDX are typically around 0.1–0.2% when buying and 0.2–0.3% when selling (the selling fee includes a 0.1% final tax on the sale value). Compare brokers.</li>
        <li><b>Dividends</b> from Indonesian companies are taxed at 10% final for individuals, and can be exempt if reinvested in Indonesia under certain conditions — check the latest rules from DJP.</li>
        <li><b>US stocks:</b> expect FX conversion costs, and US dividends are usually withheld at 15% for Indonesian residents who file a W-8BEN form.</li>
        <li>Frequent trading multiplies fees — a small edge can disappear in costs.</li>
      </ul>
      <p class="muted small">Tax rules change; confirm with DJP or a tax consultant.</p>`,
  },
];

const GLOSSARY = [
  ['ARA / ARB', 'Auto Rejection Atas / Bawah — the maximum a stock can rise or fall in one IDX trading day.'],
  ['ATR', 'Average True Range — the stock’s typical daily price movement.'],
  ['Bearish / Bullish', 'Expecting prices to fall / rise.'],
  ['Bid / Offer', 'The highest price buyers will pay / the lowest price sellers will accept.'],
  ['Blue chip', 'A large, established, financially strong company (e.g. big banks, telcos).'],
  ['BI-Rate', 'Bank Indonesia’s benchmark interest rate.'],
  ['Breakout', 'Price moving above a resistance level, often on high volume.'],
  ['Cum date / Ex date', 'Last day to buy and still receive a dividend / first day buying no longer includes it.'],
  ['Deposito', 'Time deposit at a bank with a fixed interest rate.'],
  ['DER', 'Debt-to-Equity Ratio — how much a company borrows relative to its equity.'],
  ['Dividend yield', 'Annual dividend divided by share price.'],
  ['DXY', 'US Dollar Index — the dollar’s strength against major currencies.'],
  ['EPS', 'Earnings per share — net profit divided by number of shares.'],
  ['ETF', 'Exchange-traded fund — a basket of assets that trades like a single stock.'],
  ['Fed', 'The US Federal Reserve — sets US interest rates.'],
  ['Gorengan', 'Slang for small stocks with prices pumped by speculation; very high risk.'],
  ['IHSG', 'Indeks Harga Saham Gabungan (JCI) — the index of all IDX stocks.'],
  ['IPO', 'Initial Public Offering — when a company first sells shares to the public.'],
  ['Limit order', 'An order to buy or sell only at a specific price or better.'],
  ['Lot', 'Trading unit on IDX: 1 lot = 100 shares.'],
  ['LQ45 / IDX30', 'Indices of the 45 / 30 most liquid, large IDX stocks.'],
  ['Market order', 'An order to buy or sell immediately at the best available price.'],
  ['Moving average (MA)', 'Average closing price over the last N days; smooths out noise to show the trend.'],
  ['Net foreign buy / sell', 'Whether foreign investors bought more than they sold (or vice versa).'],
  ['OJK', 'Otoritas Jasa Keuangan — Indonesia’s financial services regulator.'],
  ['ORI / SBR', 'Indonesian retail government bonds — tradable (ORI) and non-tradable savings bonds (SBR).'],
  ['PBV', 'Price-to-Book Value — share price relative to the company’s net assets per share.'],
  ['PER', 'Price-to-Earnings Ratio — share price divided by EPS.'],
  ['RDN', 'Rekening Dana Nasabah — your bank account for stock trading cash.'],
  ['Reksa dana', 'Mutual fund — professionally managed pooled investment (money market, bond, equity).'],
  ['Resistance', 'A price level where selling has repeatedly stopped rises.'],
  ['Right issue', 'A company offering new shares to existing shareholders, usually at a discount.'],
  ['ROE', 'Return on Equity — net profit as % of shareholders’ equity.'],
  ['RSI', 'Relative Strength Index — 0–100 momentum gauge; >70 overbought, <30 oversold.'],
  ['SID', 'Single Investor Identification — your unique investor number in Indonesia.'],
  ['Stock split', 'Dividing each share into more, cheaper shares; company value doesn’t change.'],
  ['Stop-loss', 'A pre-set price at which you sell to limit a loss.'],
  ['Support', 'A price level where buying has repeatedly stopped declines.'],
  ['Take profit', 'Selling some or all of a position to lock in gains.'],
  ['Volatility', 'How much a price swings; higher volatility = higher risk.'],
  ['Yield (bond)', 'The return a bond pays; when yields rise, bond prices fall.'],
];

let chart;

export default function learn(el) {
  el.innerHTML = `
    <div class="page-head">
      <div><h1>Learn</h1><p>From your first stock to reading the economy — plus calculators and a glossary.</p></div>
    </div>
    <div class="learn-layout">
      <nav class="learn-toc">
        ${LESSONS.map(l => `<a href="javascript:void 0" data-to="${l.id}">${esc(l.title)}</a>`).join('')}
        <a href="javascript:void 0" data-to="calculators">Calculators</a>
        <a href="javascript:void 0" data-to="glossary">Glossary</a>
      </nav>
      <div>
        ${LESSONS.map((l, i) => `<section class="card lesson" id="l-${l.id}">
          <h2><span class="muted num">${i + 1}.</span> ${esc(l.title)} <span class="level">${l.level}</span></h2>${l.html}</section>`).join('')}

        <section class="card lesson" id="l-calculators">
          <h2>Calculators</h2>
          <h3 style="font-size:14px;margin:4px 0 8px">Compound growth — what regular investing becomes</h3>
          <div class="calc" id="cg">
            <label class="field">Currency<select name="cur">${Object.keys(CURRENCIES).map(c => `<option value="${c}">${currencyLabel(c)}</option>`).join('')}</select></label>
            <label class="field">Starting amount<input type="number" name="start" value="10000000" min="0"></label>
            <label class="field">Monthly investment<input type="number" name="monthly" value="2000000" min="0"></label>
            <label class="field">Yearly return %<input type="number" name="rate" value="8" step="0.5"></label>
            <label class="field">Years<input type="number" name="years" value="15" min="1" max="50"></label>
          </div>
          <div class="calc-out" id="cg-out"></div>
          <div class="chart-box sm" style="margin-top:12px"><canvas id="cg-chart"></canvas></div>
          <p class="muted small">Returns are never guaranteed and vary year to year; 8% is only an example.</p>

          <h3 style="font-size:14px;margin:22px 0 8px">Position size — how many shares to buy</h3>
          <div class="calc" id="ps">
            <label class="field">Portfolio size<input type="number" name="cap" value="100000000" min="0"></label>
            <label class="field">Risk per trade %<input type="number" name="risk" value="1" step="0.25" min="0"></label>
            <label class="field">Entry price<input type="number" name="entry" value="5000" step="any"></label>
            <label class="field">Stop-loss price<input type="number" name="stop" value="4600" step="any"></label>
            <label class="field">Market<select name="mkt"><option value="100">IDX (1 lot = 100)</option><option value="1">US (1 share)</option><option value="1000">Taiwan (1 lot = 1,000)</option></select></label>
          </div>
          <div class="calc-out" id="ps-out"></div>

          <h3 style="font-size:14px;margin:22px 0 8px">Emergency fund target</h3>
          <div class="calc" id="ef">
            <label class="field">Monthly expenses<input type="number" name="exp" value="8000000" min="0"></label>
            <label class="field">Months<select name="m"><option value="3">3 (stable job)</option><option value="6" selected>6 (recommended)</option><option value="12">12 (freelance / business)</option></select></label>
            <label class="field">Saved so far<input type="number" name="have" value="20000000" min="0"></label>
          </div>
          <div class="calc-out" id="ef-out"></div>
        </section>

        <section class="card lesson" id="l-glossary">
          <h2>Glossary <input id="gl-q" placeholder="Search terms…" style="font-weight:400;width:200px"></h2>
          <dl class="glossary" id="gl"></dl>
        </section>
      </div>
    </div>`;

  el.querySelectorAll('[data-to]').forEach(a => a.onclick = () => el.querySelector('#l-' + a.dataset.to).scrollIntoView({ behavior: 'smooth' }));

  const val = (form, name) => +form.querySelector(`[name=${name}]`).value || 0;

  const cg = el.querySelector('#cg');
  const compound = () => {
    const cur = cg.querySelector('[name=cur]').value;
    const start = val(cg, 'start'), monthly = val(cg, 'monthly'), years = Math.min(50, Math.max(1, val(cg, 'years')));
    const r = val(cg, 'rate') / 100 / 12;
    let bal = start, paid = start;
    const labels = [], balances = [], contributions = [];
    for (let y = 1; y <= years; y++) {
      for (let m = 0; m < 12; m++) { bal = bal * (1 + r) + monthly; paid += monthly; }
      labels.push('Y' + y); balances.push(Math.round(bal)); contributions.push(Math.round(paid));
    }
    el.querySelector('#cg-out').innerHTML = `After <b>${years} years</b> you’d have about <b class="up">${fmtMoney(bal, cur)}</b>. You put in ${fmtMoney(paid, cur)}; growth added <b>${fmtMoney(bal - paid, cur)}</b>.`;
    if (chart) chart.destroy();
    if (window.Chart) chart = new Chart(el.querySelector('#cg-chart'), {
      type: 'line',
      data: { labels, datasets: [
        { label: 'Portfolio value', data: balances, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,.12)', fill: true, tension: .3, pointRadius: 0 },
        { label: 'Money you put in', data: contributions, borderColor: '#8b95a8', borderDash: [5, 4], tension: 0, pointRadius: 0 },
      ] },
      options: { maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
        plugins: { tooltip: { callbacks: { label: c => `${c.dataset.label}: ${fmtMoney(c.raw, cur)}` } } },
        scales: { y: { ticks: { callback: v => fmtMoney(v, cur, true) } } } },
    });
  };
  cg.addEventListener('input', compound);
  compound();

  const ps = el.querySelector('#ps');
  const position = () => {
    const cap = val(ps, 'cap'), risk = val(ps, 'risk') / 100, entry = val(ps, 'entry'), stop = val(ps, 'stop'), lot = val(ps, 'mkt');
    const out = el.querySelector('#ps-out');
    if (!entry || !stop || stop >= entry) { out.innerHTML = '<span class="down">Stop-loss must be below the entry price.</span>'; return; }
    const maxLoss = cap * risk;
    const perShare = entry - stop;
    const lots = Math.floor(maxLoss / perShare / lot);
    const shares = lots * lot;
    const cost = shares * entry;
    out.innerHTML = lots > 0
      ? `Buy <b>${fmtNum(lots, 0)} ${lot === 1 ? 'shares' : `lots (${fmtNum(shares, 0)} shares)`}</b> costing about <b>${fmtNum(cost, 0)}</b> (${((cost / cap) * 100).toFixed(1)}% of portfolio). If the stop is hit you lose about <b class="down">${fmtNum(shares * perShare, 0)}</b> — ${((shares * perShare / cap) * 100).toFixed(2)}% of your portfolio.${cost > cap ? ' <span class="down">That’s more than your whole portfolio — the stop is too tight; buy less or use a wider stop.</span>' : ''}`
      : `Your risk budget (${fmtNum(maxLoss, 0)}) is too small for even 1 ${lot === 1 ? 'share' : 'lot'} with this stop distance. Use a closer stop or skip this trade.`;
  };
  ps.addEventListener('input', position);
  position();

  const ef = el.querySelector('#ef');
  const emergency = () => {
    const target = val(ef, 'exp') * val(ef, 'm'), have = val(ef, 'have');
    const pct = target ? Math.min(100, (have / target) * 100) : 0;
    el.querySelector('#ef-out').innerHTML = `Target: <b>${fmtNum(target, 0)}</b>. You have ${pct.toFixed(0)}% of it.
      <div class="breadth-bar" style="margin-top:8px"><div class="a" style="width:${pct}%"></div></div>
      ${have >= target ? '<span class="up">Fully funded — you can focus on investing.</span>' : `Still need <b>${fmtNum(target - have, 0)}</b> before investing heavily in stocks.`}`;
  };
  ef.addEventListener('input', emergency);
  emergency();

  const gl = el.querySelector('#gl');
  const drawGlossary = q => {
    q = q.trim().toLowerCase();
    const items = GLOSSARY.filter(([t, d]) => !q || t.toLowerCase().includes(q) || d.toLowerCase().includes(q));
    gl.innerHTML = items.map(([t, d]) => `<dt>${esc(t)}</dt><dd>${esc(d)}</dd>`).join('') || '<dd>No matching terms.</dd>';
  };
  el.querySelector('#gl-q').addEventListener('input', e => drawGlossary(e.target.value));
  drawGlossary('');

  return () => { if (chart) { chart.destroy(); chart = null; } };
}
