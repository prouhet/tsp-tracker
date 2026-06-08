
import { FUNDS, fetchDailyPrices, computeSignals } from "../../lib/marketData";
 
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
 
  try {
    const results = [];
 
    for (const fund of FUNDS) {
      const priceData = await fetchDailyPrices(fund.proxy);
      const signals = computeSignals(priceData);
      results.push({ ...fund, ...signals });
 
      // Wait 15s between Alpha Vantage calls to stay within free tier rate limit
      // (5 requests/minute). Skip delay after the last fund.
      if (fund !== FUNDS[FUNDS.length - 1]) {
        await new Promise((r) => setTimeout(r, 15000));
      }
    }
 
    // Sort by composite score descending
    results.sort((a, b) => b.composite - a.composite);
 
    res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate");
    res.status(200).json({
      funds: results,
      updatedAt: new Date().toISOString(),
      isDemo: results.some((f) => f.source === "demo"),
    });
  } catch (err) {
    console.error("API error:", err);
    res.status(500).json({ error: "Failed to fetch market data" });
  }
}
