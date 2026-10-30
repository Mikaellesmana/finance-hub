# Finance Hub

Personal finance dashboard for US 🇺🇸 and Indonesian 🇮🇩 markets.

| Page | What it does |
|---|---|
| **Home** | Indonesia Economy Watch: macro snapshot (BI-Rate, inflation, GDP, Fed), live drivers (rupiah, US yields, dollar, coal, copper, oil, gold, China, Wall Street) explained in terms of which IDX sectors win or lose, what to watch next, and Indonesian economy news. |
| **Market Flow** | Index cards (S&P 500, Nasdaq, Dow, IHSG, LQ45, USD/IDR, gold, oil, BTC…), US vs Indonesia panels with breadth, sector heatmaps, gainers/losers, money flow (value traded) and unusual volume, plus sector flow bars. Auto-refreshes every 60s. |
| **My Finances** | Your financial statement: cashflow (income/expenses by month & category), investments (live-priced IDX, US and Taiwan holdings, P/L, allocation), assets & liabilities, net worth and balance sheet. Show everything in IDR, USD or NTD using live exchange rates. |
| **Trading View** | Live TradingView chart (indicators, drawing tools, any symbol) + technical-analysis gauge, quote stats and a watchlist. |
| **Stock Ideas** | Buy / Buy on dip / Hold / Take profit / Sell signals for tracked US & IDX stocks and for your own holdings, each with a buy zone, stop-loss and targets (ATR-based, rounded to exchange tick sizes). Rule-based and educational only — not financial advice. |
| **Learn** | Lessons from investing basics to risk management and how the economy moves stocks, plus compound-growth, position-size and emergency-fund calculators and a searchable glossary. |

## Run

Requires Node 18+ (no npm install needed).

```bash
npm start
```

Open http://localhost:3000

## Data

- Market data: Yahoo Finance (via the local server, cached 60s). Charts: TradingView widgets. IDX quotes may be delayed.
- **My Finances data is private to each visitor**: it's saved in their own browser (localStorage) and never sent to the server. Use **Export / Import** to back it up or move devices. Clearing browser data erases it.
- Edit the tracked stock lists in `lib/universe.js`.

## Deploy publicly (Render, free)

1. Push this folder to a new GitHub repository.
2. On https://render.com → **New → Blueprint** → pick the repo. Render reads `render.yaml` and deploys it.
3. You get a public URL like `https://finance-hub.onrender.com`.

The free plan sleeps after ~15 min idle, so the first visit afterwards takes ~30–60s to wake up.
The server rate-limits each visitor to 120 API calls/minute and only accepts ticker-shaped symbols.

## Keeping the economy page current

The macro snapshot (BI-Rate, inflation, GDP, Fed rate, "what to watch") is hand-maintained in `lib/macro.js` — update it after each Bank Indonesia, BPS or Fed release and push. Market drivers and news update live.
