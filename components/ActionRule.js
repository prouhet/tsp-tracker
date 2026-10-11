const usd = (v) => `$${v.toFixed(2)}`;
const pct = (v, d = 1) => `${v > 0 ? "+" : ""}${v.toFixed(d)}%`;

export default function ActionRule({ rule, stats }) {
  const inC = rule.hold === "C";
  const color = inC ? "#00ff88" : "#fbbf24";
  const headline = inC ? "IN C" : "IN G";
  const text = inC
    ? `The C Fund closed ${Math.abs(rule.pctVsAverage).toFixed(1)}% above its 200-day average, so this layer stays in C. If C closes below ${usd(rule.sellTrigger)}, a ${Math.abs(rule.pctToTrigger).toFixed(1)}% fall from here, your plan moves this layer (60% of the balance) to G.`
    : `The C Fund closed ${Math.abs(rule.pctVsAverage).toFixed(1)}% ${rule.pctVsAverage < 0 ? "below" : "above"} its 200-day average, so this layer is in G. If C closes above ${usd(rule.buyTrigger)}, ${Math.abs(rule.pctToTrigger).toFixed(1)}% from here, your plan moves this layer (60% of the balance) back to C.`;
  const tiles = [
    ["C FUND CLOSE", usd(rule.price)],
    ["200-DAY AVERAGE", usd(rule.average)],
    ["VS AVERAGE", pct(rule.pctVsAverage)],
    [inC ? "SELL TRIGGER" : "BUY TRIGGER", usd(inC ? rule.sellTrigger : rule.buyTrigger)],
    ["SIGNAL SINCE", rule.since],
  ];
  return (
    <div style={{ background: `${color}0a`, border: `1px solid ${color}40`, borderRadius: 12, padding: "20px 22px", marginBottom: 20 }}>
      <div style={{ fontSize: 9, color: "#64748b", letterSpacing: 3, marginBottom: 10 }}>◈ THE 200-DAY RULE · YOUR PLAN'S 60% LAYER · AS OF {rule.asOf}</div>
      <div style={{ display: "flex", gap: 18, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ fontSize: 30, fontWeight: 700, color, whiteSpace: "nowrap" }}>● {headline}</div>
        <p style={{ flex: "1 1 280px", fontSize: 13, color: "#cbd5e1", lineHeight: 1.6, fontFamily: "Georgia, serif" }}>{text}</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8, marginTop: 16 }}>
        {tiles.map(([k, v]) => (
          <div key={k} style={{ background: "#0b1324", border: "1px solid #1e293b", borderRadius: 8, padding: "8px 10px" }}>
            <div style={{ fontSize: 8, color: "#64748b", letterSpacing: 2 }}>{k}</div>
            <div style={{ fontSize: 14, color: "#e2e8f0", marginTop: 3 }}>{v}</div>
          </div>
        ))}
      </div>
      {stats && (
        <div style={{ fontSize: 10, color: "#64748b", marginTop: 14 }}>
          The rule on its own, all in or all out, since 2004: {(stats.cagr * 100).toFixed(1)}% a year, worst drop {(stats.maxDrawdown * 100).toFixed(1)}%, {stats.switches} switches.
        </div>
      )}
      <p style={{ fontSize: 10, color: "#475569", lineHeight: 1.7, marginTop: 12 }}>
        Checked on every daily close, acted on at the next close: a TSP interfund transfer requested before noon ET settles that day.
        The ±3% buffer around the average avoids whipsaw. Changing your contribution election for new money doesn't use up your two monthly transfers.
      </p>
    </div>
  );
}
