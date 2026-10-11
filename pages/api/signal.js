import { getTspHistory } from "../../lib/tspData";
import { buildSignal } from "../../lib/engine";

export const config = { maxDuration: 30 };

// GET /api/signal            full payload for the dashboard
// GET /api/signal?brief=1    compact payload for the morning brief (no chart data)
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  try {
    const rows = await getTspHistory();
    const signal = buildSignal(rows);
    if (req.query.brief) {
      delete signal.backtest.curve;
      signal.backtest.annual = signal.backtest.annual.slice(0, 5);
      signal.backtest.switches = signal.backtest.switches.slice(0, 6);
      signal.funds = signal.funds.map(({ chart, ...f }) => f);
    }
    res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=86400");
    res.status(200).json(signal);
  } catch (err) {
    console.error("signal error:", err);
    res.status(502).json({ error: err.message });
  }
}
