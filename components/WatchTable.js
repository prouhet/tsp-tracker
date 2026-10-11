const UP = "#00ff88", DOWN = "#ff4466", MUTED = "#64748b";

function Cell({ up, label, turned }) {
  return (
    <td style={{ padding: "8px 6px", textAlign: "center" }}>
      <span style={{ color: up ? UP : DOWN, fontSize: 11 }}>{up ? "▲" : "▼"} {label}</span>
      {turned && <span style={{ marginLeft: 4, fontSize: 8, color: "#fbbf24", border: "1px solid #fbbf2455", borderRadius: 4, padding: "0 3px" }}>NEW</span>}
    </td>
  );
}

export default function WatchTable({ watch, funds }) {
  const ids = ["C", "S", "I", "F"];
  const colorOf = Object.fromEntries(funds.map((f) => [f.id, f.color]));
  const anyFund = watch.funds.C;
  return (
    <div style={{ background: "rgba(15,23,42,0.9)", border: "1px solid #1e293b", borderRadius: 12, padding: "18px 20px", marginBottom: 20 }}>
      <div style={{ fontSize: 9, color: MUTED, letterSpacing: 3, marginBottom: 4 }}>◈ WEEKLY MOMENTUM WATCH · WEEK ENDING {anyFund.weekEnding}</div>
      <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 12, fontFamily: "Georgia, serif" }}>
        A heads-up on which funds are turning, not a trigger to switch.
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, minWidth: 560 }}>
          <thead>
            <tr style={{ color: MUTED, fontSize: 9, letterSpacing: 1.5 }}>
              {["FUND", "VS 40-WK AVG", "PPO HIST", "RSI 14", "SQUEEZE", "MARKOV", "26-WK RETURN", "UP"].map((h) => (
                <th key={h} style={{ padding: "6px", textAlign: h === "FUND" ? "left" : "center", borderBottom: "1px solid #1e293b", fontWeight: 400 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ids.map((id) => {
              const w = watch.funds[id];
              return (
                <tr key={id} style={{ borderBottom: "1px solid #0f172a" }}>
                  <td style={{ padding: "8px 6px", color: colorOf[id], fontWeight: 700 }}>
                    {id}{watch.leader === id && <span style={{ marginLeft: 6, fontSize: 8, color: "#e2e8f0", border: "1px solid #334155", borderRadius: 4, padding: "0 4px" }}>LEADS</span>}
                  </td>
                  <Cell up={w.trendUp} label={`${w.vs40Week > 0 ? "+" : ""}${w.vs40Week.toFixed(1)}%`} />
                  <Cell up={w.ppo.up} label={w.ppo.hist.toFixed(2)} turned={w.ppo.turned} />
                  <Cell up={w.rsi.up} label={w.rsi.value.toFixed(0)} turned={w.rsi.turned} />
                  <Cell up={w.squeeze.up} label={w.squeeze.rising ? "rising" : "falling"} turned={w.squeeze.turned} />
                  <Cell up={w.markov.up} label={w.markov.state || "—"} />
                  <td style={{ padding: "8px 6px", textAlign: "center", color: w.return26Week >= 0 ? "#94a3b8" : DOWN }}>
                    {w.return26Week > 0 ? "+" : ""}{w.return26Week.toFixed(1)}%
                  </td>
                  <td style={{ padding: "8px 6px", textAlign: "center", color: w.upCount >= 4 ? UP : w.upCount <= 1 ? DOWN : "#fbbf24" }}>{w.upCount}/5</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 10, color: "#475569", lineHeight: 1.7, marginTop: 12 }}>
        {watch.leader ? `Strongest fund above its 40-week average over 26 weeks: ${watch.leader}. ` : "No fund is above its 40-week average. "}
        Tested on official prices since 2004, switching on these weekly signals or rotating into the leader returned less than the action rule
        with deeper drops, so they're shown as context only. Squeeze uses closes only (TSP publishes no highs or lows); Markov is a 20-week
        bull/sideways/bear regime model.
      </p>
    </div>
  );
}
