// Economy page content: dated macro snapshot + live market drivers and how they affect Indonesian stocks.
// Update SNAPSHOT after each Bank Indonesia / BPS / Fed release.

const SNAPSHOT = {
  asOf: '2026-10-31',
  items: [
    {
      key: 'bi', label: 'BI-Rate', value: '5.75%', sub: 'Held 21 Oct 2026 · Deposit facility raised to 5.00%',
      tone: 'neg',
      note: 'Bank Indonesia hiked in June 2026 and has held since, while raising the deposit facility rate to defend the rupiah. Tight money keeps loan costs high — a headwind for property, autos and small caps; banks earn more on deposits placed at BI.',
      source: 'https://www.bi.go.id/en/publikasi/ruang-media/news-release/Pages/sp_2823326.aspx',
    },
    {
      key: 'cpi', label: 'Inflation (CPI)', value: '3.28%', sub: 'Sep 2026 y/y · core 2.84% · target 2.5 ± 1%',
      tone: 'neu',
      note: 'Inside BI’s target band but drifting up (3.19% in August), led by food and transport. Rising prices squeeze household spending — watch consumer staples and retail.',
      source: 'https://www.bps.go.id/en/pressrelease/2026/10/01/2623/the-year-on-year--y-on-y--headline-inflation-in-september-2026-was-recorded-at-3-28-percent-.html',
    },
    {
      key: 'gdp', label: 'GDP growth', value: '5.29%', sub: 'Q2 2026 y/y · Q1 was 5.61%',
      tone: 'pos',
      note: 'Growth beat forecasts, driven by household consumption and investment; mining was the weak spot. Solid domestic demand supports banks, telcos and consumer names.',
      source: 'https://en.antaranews.com/amp/news/425619/manufacturing-consumption-drive-indonesias-529-percent-q2-growth',
    },
    {
      key: 'fed', label: 'US Fed funds rate', value: '3.75–4.00%', sub: 'Held 28 Oct 2026 · markets price a December hike',
      tone: 'neg',
      note: 'With US inflation still elevated and hikes expected, US yields stay attractive. That pulls foreign money out of emerging markets like Indonesia and pressures the rupiah.',
      source: 'https://www.cnbc.com/2026/10/28/fed-meeting-today-live-updates.html',
    },
  ],
  watch: [
    'Early November — BPS releases October inflation and Q3 2026 GDP.',
    '3 November — US midterm elections: market volatility and dollar moves.',
    'November — Bank Indonesia board meeting: hold vs. hike to defend the rupiah.',
    'December — Fed meeting: a hike would add pressure on the rupiah and foreign flows.',
    'MSCI decisions on Indonesia — headlines warn a downgrade could trigger more foreign selling and rupiah weakness.',
    'Coal, nickel and copper prices — Indonesia’s main export earners and big IDX sectors.',
  ],
};

// Live drivers. `good` = direction of the 1-month move that helps the IDX overall
// (+1 = rising is good, -1 = rising is bad). Thresholds are in % (or points for yields).
const DRIVERS = [
  { symbol: 'IDR=X', label: 'USD / IDR', good: -1, threshold: 1, unit: '',
    up: 'Rupiah weakened {chg} in a month. Foreign investors tend to sell IDX stocks when the rupiah slides, and importers / firms with USD debt get squeezed. Exporters (coal, metals, CPO) earn more in rupiah.',
    down: 'Rupiah strengthened {chg} in a month — usually a sign of foreign inflows, good for banks and consumer stocks.',
    winners: { up: ['Coal & metals exporters'], down: ['Banks', 'Consumer', 'Importers'] },
    losers: { up: ['Importers', 'Airlines', 'Pharma', 'USD-debt firms'], down: ['Exporters'] } },
  { symbol: '^TNX', label: 'US 10-year yield', good: -1, threshold: 0.15, unit: 'pts',
    up: 'US 10-year yield rose {chg}. Higher US yields pull money from emerging markets and raise Indonesia’s borrowing costs.',
    down: 'US 10-year yield fell {chg}, easing pressure on emerging markets and the rupiah.',
    winners: { up: [], down: ['Banks', 'Property', 'Growth stocks'] },
    losers: { up: ['Property', 'Growth stocks', 'Rupiah'], down: [] } },
  { symbol: 'DX-Y.NYB', label: 'US Dollar Index', good: -1, threshold: 1, unit: '',
    up: 'The US dollar strengthened {chg} against major currencies — typically means outflows from emerging markets.',
    down: 'The US dollar weakened {chg}, which usually supports emerging-market stocks and currencies.',
    winners: { up: [], down: ['Emerging markets'] }, losers: { up: ['Rupiah', 'Foreign flows'], down: [] } },
  { symbol: 'MTF=F', label: 'Coal (API2)', good: 1, threshold: 5, unit: '',
    up: 'Coal prices rose {chg}. Coal miners are a large part of the IDX and of Indonesia’s exports.',
    down: 'Coal prices fell {chg}, a headwind for coal miners’ earnings and Indonesia’s trade balance.',
    winners: { up: ['ADRO', 'PTBA', 'ITMG', 'AADI'], down: ['Power users'] }, losers: { up: [], down: ['ADRO', 'PTBA', 'ITMG', 'AADI'] } },
  { symbol: 'HG=F', label: 'Copper', good: 1, threshold: 5, unit: '',
    up: 'Copper rose {chg} — a signal of strong global industrial demand, good for Indonesian metal miners.',
    down: 'Copper fell {chg}, signalling weaker global demand for metals.',
    winners: { up: ['AMMN', 'MDKA', 'ANTM', 'INCO'], down: [] }, losers: { up: [], down: ['AMMN', 'MDKA', 'ANTM', 'INCO'] } },
  { symbol: 'CL=F', label: 'Crude oil', good: 0, threshold: 8, unit: '',
    up: 'Oil jumped {chg}. Good for oil & gas producers, but raises fuel-subsidy costs and transport / consumer prices.',
    down: 'Oil fell {chg}. Lower costs for consumers and the state budget; weaker for oil & gas producers.',
    winners: { up: ['MEDC', 'PGAS'], down: ['Consumer', 'Transport'] }, losers: { up: ['Consumer', 'Transport'], down: ['MEDC', 'PGAS'] } },
  { symbol: 'GC=F', label: 'Gold', good: 0, threshold: 5, unit: '',
    up: 'Gold rose {chg} — often a sign of global risk-aversion, but it lifts gold miners.',
    down: 'Gold fell {chg} — lower selling prices for gold miners.',
    winners: { up: ['ANTM', 'MDKA'], down: [] }, losers: { up: [], down: ['ANTM', 'MDKA'] } },
  { symbol: '000001.SS', label: 'China (Shanghai)', good: 1, threshold: 3, unit: '',
    up: 'Chinese stocks rose {chg}. China is Indonesia’s largest trading partner and the main buyer of its coal and nickel.',
    down: 'Chinese stocks fell {chg}, a warning sign for demand for Indonesian commodities.',
    winners: { up: ['Commodity exporters'], down: [] }, losers: { up: [], down: ['Commodity exporters'] } },
  { symbol: '^GSPC', label: 'US stocks (S&P 500)', good: 1, threshold: 3, unit: '',
    up: 'Wall Street rose {chg}. Global risk appetite generally spills over to emerging markets.',
    down: 'Wall Street fell {chg}. Global risk-off moods usually hit emerging markets too.',
    winners: { up: ['Foreign flows'], down: [] }, losers: { up: [], down: ['Foreign flows'] } },
];

const INDO = ['^JKSE', '^JKLQ45', 'EIDO'];

module.exports = { SNAPSHOT, DRIVERS, INDO };
