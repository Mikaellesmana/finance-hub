# Finance Hub

Personal finance dashboard for US 🇺🇸 and Indonesian 🇮🇩 markets.

| Page | What it does |
|---|---|
| **Market Flow** | Index cards (S&P 500, Nasdaq, Dow, IHSG, LQ45, USD/IDR, gold, oil, BTC…), US vs Indonesia panels with breadth, sector heatmaps, gainers/losers, money flow (value traded) and unusual volume, plus sector flow bars. Auto-refreshes every 60s. |
| **My Finances** | Your financial statement: cashflow (income/expenses by month & category), investments (live-priced holdings, P/L, allocation), assets & liabilities, net worth and balance sheet. IDR or USD base currency. |
| **Trading View** | Live TradingView chart (indicators, drawing tools, any symbol) + technical-analysis gauge, quote stats and a watchlist. |
| **Stock Ideas** | Ranks tracked US / IDX stocks with a transparent 0–100 score (trend, momentum, RSI, risk) and explains each score. Educational only — not financial advice. |

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
