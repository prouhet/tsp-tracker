export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { summary } = req.body || {};
  if (!summary) return res.status(400).json({ error: "Missing summary" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(200).json({ insight: "AI analysis isn't set up: add ANTHROPIC_API_KEY in Vercel's environment variables." });
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        messages: [{
          role: "user",
          content:
            "You are summarizing a TSP fund dashboard for its owner. His plan is the decision: a C Fund ladder whose layers and target are given in the summary below; the volatility gauge and weekly indicators are context only. " +
            "In 3-4 plain sentences: restate the plan's target, how close the next step is, what the volatility reading says about the odds of a big drop, and anything notable in the weekly readings. " +
            "Do not recommend a different allocation than the plan, and note this is not financial advice.\n\n" + summary,
        }],
      }),
    });
    const data = await response.json();
    if (data.error) return res.status(200).json({ insight: `Error: ${data.error.message}` });
    const insight = data.content?.map((b) => b.text || "").join("") || "Unable to generate insight.";
    res.status(200).json({ insight });
  } catch (err) {
    res.status(500).json({ error: "AI insight failed" });
  }
}
