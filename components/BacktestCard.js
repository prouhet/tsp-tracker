import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend } from "recharts";

const p = (v, d = 1) => `${v > 0 ? "+" : ""}${(v * 100).toFixed(d)}%`;
const usd0 = (v) => `$${Math.round(v).toLocaleString()}`;

export default function BacktestCard({ bt }) {
  if (!bt) return null;
  const tiles = [
    ["PLAN · RETURN A YEAR", `${(bt.rule.cagr * 100).toFixed(1)}%`, usd0(bt.rule.final) + " from $10,000"],
    ["HOLD C · RETURN A YEAR", `${(bt.holdC.cagr * 100).toFixed(1)}%`, usd0(bt.holdC.final)],
    ["PLAN · WORST DROP", `${(bt.rule.maxDrawdown * 100).toFixed(1)}%`, `hold C: ${(bt.holdC.maxDrawdown * 100).toFixed(1)}%`],
    ["PLAN · WORST 12 MONTHS", `${(bt.rule.worst12 * 100).toFixed(1)}%`, `about ${Math.round(bt.rule.movesPerYear)} transfers a year`],
  ];
  return (
    <div style={{ background: "rgba(15,23,42,0.9)", border: "1px solid #1e293b", borderRadius: 12, padding: "18px 20px", marginBottom: 20 }}>
      <div style={{ fontSize: 9, color: "#64748b", letterSpacing: 3, marginBottom: 12 }}>◈ PLAN BACKTEST · {bt.start} TO {bt.end} · OFFICIAL PRICES</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, marginBottom: 14 }}>
        {tiles.map(([k, v, sub]) => (
          <div key={k} style={{ background: "#0b1324", border: "1px solid #1e293b", borderRadius: 8, padding: "8px 10px" }}>
            <div style={{ fontSize: 8, color: "#64748b", letterSpacing: 2 }}>{k}</div>
            <div style={{ fontSize: 16, color: "#e2e8f0", marginTop: 3 }}>{v}</div>
            <div style={{ fontSize: 9, color: "#475569", marginTop: 2 }}>{sub}</div>
          </div>
        ))}
      </div>
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={bt.curve} margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
            <XAxis dataKey="d" tick={{ fontSize: 9, fill: "#475569" }} tickFormatter={(d) => d.slice(0, 4)} minTickGap={40} />
            <YAxis scale="log" domain={["auto", "auto"]} tick={{ fontSize: 9, fill: "#475569" }} tickFormatter={(v) => `$${Math.round(v / 1000)}k`} width={44} />
            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", fontSize: 11 }} formatter={(v, n) => [usd0(v), n]} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Line type="monotone" dataKey="rule" name="Your plan (ladder)" stroke="#00ff88" dot={false} strokeWidth={1.8} isAnimationActive={false} />
            <Line type="monotone" dataKey="C" name="Hold C" stroke="#00cfff" dot={false} strokeWidth={1.2} isAnimationActive={false} />
            <Line type="monotone" dataKey="G" name="Hold G" stroke="#94a3b8" dot={false} strokeWidth={1.2} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginTop: 14 }}>
        <div>
          <div style={{ fontSize: 9, color: "#64748b", letterSpacing: 2, marginBottom: 6 }}>RETURN BY YEAR</div>
          <table style={{ width: "100%", fontSize: 10, borderCollapse: "collapse" }}>
            <thead><tr style={{ color: "#475569" }}><th style={{ textAlign: "left", fontWeight: 400 }}>YEAR</th><th style={{ fontWeight: 400 }}>PLAN</th><th style={{ fontWeight: 400 }}>C</th><th style={{ fontWeight: 400 }}>G</th></tr></thead>
            <tbody>
              {bt.annual.slice(0, 10).map((a) => (
                <tr key={a.year} style={{ color: "#94a3b8" }}>
                  <td>{a.year}</td>
                  <td style={{ textAlign: "center", color: a.rule >= 0 ? "#00ff88" : "#ff4466" }}>{p(a.rule)}</td>
                  <td style={{ textAlign: "center" }}>{p(a.C)}</td>
                  <td style={{ textAlign: "center" }}>{p(a.G)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <div style={{ fontSize: 9, color: "#64748b", letterSpacing: 2, marginBottom: 6 }}>RECENT STEPS (ACTED ON)</div>
          {(bt.steps || []).slice(0, 10).map((s) => (
            <div key={s.date} style={{ fontSize: 10, color: "#94a3b8", display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
              <span>{s.date}</span><span style={{ color: s.toC > s.fromC ? "#00ff88" : "#fbbf24" }}>{s.fromC}% → {s.toC}% C</span>
            </div>
          ))}
        </div>
      </div>
      <p style={{ fontSize: 10, color: "#475569", lineHeight: 1.7, marginTop: 12 }}>
        Acts at the close after each signal and obeys TSP&apos;s limit of two unrestricted transfers a month (further moves only into G).
        No costs are charged to the plan or the benchmarks. Every result before the plan was adopted (2026-10-11) is a backtest; past results don&apos;t predict future ones.
      </p>
    </div>
  );
}
