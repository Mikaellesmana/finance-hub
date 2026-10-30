// Symbols tracked by the app (Yahoo Finance tickers).

const INDICES = [
  { symbol: '^GSPC', label: 'S&P 500', region: 'us' },
  { symbol: '^IXIC', label: 'Nasdaq', region: 'us' },
  { symbol: '^DJI', label: 'Dow Jones', region: 'us' },
  { symbol: '^RUT', label: 'Russell 2000', region: 'us' },
  { symbol: '^VIX', label: 'VIX (Fear)', region: 'us' },
  { symbol: '^JKSE', label: 'IHSG (JCI)', region: 'id' },
  { symbol: '^JKLQ45', label: 'LQ45', region: 'id' },
  { symbol: 'IDR=X', label: 'USD / IDR', region: 'fx' },
  { symbol: '^TNX', label: 'US 10Y Yield', region: 'macro' },
  { symbol: 'GC=F', label: 'Gold', region: 'macro' },
  { symbol: 'CL=F', label: 'Crude Oil', region: 'macro' },
  { symbol: 'BTC-USD', label: 'Bitcoin', region: 'macro' },
];

const US_SECTORS = [
  { symbol: 'XLK', label: 'Technology' },
  { symbol: 'XLC', label: 'Communication' },
  { symbol: 'XLY', label: 'Consumer Disc.' },
  { symbol: 'XLP', label: 'Consumer Staples' },
  { symbol: 'XLF', label: 'Financials' },
  { symbol: 'XLV', label: 'Health Care' },
  { symbol: 'XLI', label: 'Industrials' },
  { symbol: 'XLE', label: 'Energy' },
  { symbol: 'XLB', label: 'Materials' },
  { symbol: 'XLU', label: 'Utilities' },
  { symbol: 'XLRE', label: 'Real Estate' },
];

const US_STOCKS = [
  ['AAPL', 'Technology'], ['MSFT', 'Technology'], ['NVDA', 'Technology'], ['AVGO', 'Technology'],
  ['AMD', 'Technology'], ['ORCL', 'Technology'], ['CRM', 'Technology'], ['ADBE', 'Technology'],
  ['GOOGL', 'Communication'], ['META', 'Communication'], ['NFLX', 'Communication'],
  ['AMZN', 'Consumer Disc.'], ['TSLA', 'Consumer Disc.'], ['HD', 'Consumer Disc.'],
  ['COST', 'Consumer Staples'], ['WMT', 'Consumer Staples'], ['PG', 'Consumer Staples'], ['KO', 'Consumer Staples'], ['PEP', 'Consumer Staples'],
  ['JPM', 'Financials'], ['BAC', 'Financials'], ['V', 'Financials'], ['MA', 'Financials'], ['BRK-B', 'Financials'],
  ['LLY', 'Health Care'], ['UNH', 'Health Care'], ['JNJ', 'Health Care'],
  ['XOM', 'Energy'], ['CVX', 'Energy'],
  ['CAT', 'Industrials'], ['GE', 'Industrials'],
].map(([symbol, sector]) => ({ symbol, sector }));

const ID_STOCKS = [
  ['BBCA.JK', 'Banks'], ['BBRI.JK', 'Banks'], ['BMRI.JK', 'Banks'], ['BBNI.JK', 'Banks'], ['BRIS.JK', 'Banks'],
  ['TLKM.JK', 'Telco & Tech'], ['ISAT.JK', 'Telco & Tech'], ['EXCL.JK', 'Telco & Tech'], ['TOWR.JK', 'Telco & Tech'], ['GOTO.JK', 'Telco & Tech'],
  ['ASII.JK', 'Industrials'], ['UNTR.JK', 'Industrials'], ['SMGR.JK', 'Industrials'],
  ['UNVR.JK', 'Consumer'], ['ICBP.JK', 'Consumer'], ['INDF.JK', 'Consumer'], ['AMRT.JK', 'Consumer'], ['CPIN.JK', 'Consumer'], ['MAPI.JK', 'Consumer'], ['KLBF.JK', 'Consumer'],
  ['ADRO.JK', 'Energy & Mining'], ['AADI.JK', 'Energy & Mining'], ['PTBA.JK', 'Energy & Mining'], ['ITMG.JK', 'Energy & Mining'], ['MEDC.JK', 'Energy & Mining'], ['PGAS.JK', 'Energy & Mining'],
  ['ANTM.JK', 'Metals'], ['MDKA.JK', 'Metals'], ['INCO.JK', 'Metals'], ['AMMN.JK', 'Metals'],
  ['BREN.JK', 'Renewables'],
].map(([symbol, sector]) => ({ symbol, sector }));

module.exports = { INDICES, US_SECTORS, US_STOCKS, ID_STOCKS };
