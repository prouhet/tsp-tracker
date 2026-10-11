# TSP Fund Signal Tracker

One tested action rule for a TSP allocation, on official tsp.gov share prices.

## What it shows

- **Action rule:** hold the C Fund while it closes more than 3% above its 200-day average; move to G once it closes more than 3% below; otherwise do nothing. Checked on each daily close, acted on at the next close. You choose what share of the balance the rule moves (100/75/50/25%).
- **Weekly momentum watch:** for C, S, I and F, the weekly PPO histogram, RSI(14), Squeeze Momentum (closes only), a Markov regime read, distance from the 40-week average and 26-week return. Context only.
- **Backtest:** the rule vs holding C or G since 2004-03-18, obeying TSP's two-unrestricted-transfers-a-month limit.
- **Fund cards:** official prices, 50/200-day averages, daily RSI, 1-year return.

The rule was picked after testing ~45 alternatives on official prices since 2004 (rotating among all five funds, buying beaten-down funds, PPO/RSI/Squeeze/Markov triggers, daily vs weekly). None beat it on return and drawdown together.

## Data

Prices come from `https://www.tsp.gov/data/fund-price-history.csv` (no API key). tsp.gov publishes the full history as one static file, regenerated once a day, and ignores date parameters, so:

- **Stored history:** every build runs `scripts/snapshot-tsp.mjs`, which saves the full history and the file's version tags into the deployment (`data/tsp-history.json`, not committed).
- **Only new prices are downloaded:** at runtime the app asks tsp.gov whether the file changed since its stored copy (at most every 30 minutes per server). Unchanged → "not modified", zero bytes. Changed → one download, which replaces the stored copy.
- **Outages:** if tsp.gov can't be reached the app keeps showing the stored official prices and says so. It never falls back to made-up data.

## Data feed

`GET /api/signal` returns the rule, weekly watch, fund snapshots and backtest as JSON. `GET /api/signal?brief=1` returns a compact version for the morning brief.

## Environment variables

- `ANTHROPIC_API_KEY` (optional): enables the AI summary button.
- `TSP_CSV_FILE` (local development only): path to a downloaded tsp.gov CSV to work offline.

## Run locally

```bash
npm install
npm run dev
```

Educational only, not financial advice.
