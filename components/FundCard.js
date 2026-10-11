import { useState } from "react";
import MiniChart from "./MiniChart";

export default function FundCard({ fund }) {
  const [open, setOpen] = useState(false);
  const up = fund.change >= 0;
  const above = fund.pctVs200 >= 0;
  const rows = [
    ["50-DAY AVG", fund.sma50 != null ? `$${fund.sma50.toFixed(2)}` : "—"],
    ["200-DAY AVG", fund.sma200 != null ? `$${fund.sma200.toFixed(2)}` : "—"],
    ["VS 200-DAY", `${above ? "+" : ""}${fund.pctVs200.toFixed(1)}%`],
    ["RSI (14, DAILY)", fund.rsi14 != null ? fund.rsi14.toFixed(1) : "—"],
    ["1-YEAR RETURN", `${fund.return1y >= 0 ? "+" : ""}${fund.return1y.toFixed(1)}%`],
  ];
  return (
    <div onClick={() => setOpen(!open)} style={{
      background: open ? `${fund.color}08` : "rgba(15,23,42,0.9)", border: `1px solid ${open ? fund.color + "44" : "#1e293b"}`,
      borderRadius: 12, padding: "16px 20px", cursor: "pointer", transition: "all 0.25s ease",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <span style={{ fontSize: 22, fontWeight: 700, color: fund.color }}>{fund.id}</span>
          <span style={{ color: "#64748b", fontSize: 12, marginLeft: 10 }}>{fund.name}</span>
          <div style={{ color: "#475569", fontSize: 10, fontStyle: "italic", marginTop: 2 }}>{fund.desc} · official tsp.gov share price</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 18, color: "#e2e8f0" }}>${fund.price.toFixed(2)}</div>
          <div style={{ fontSize: 11, color: up ? "#00ff88" : "#ff4466" }}>{up ? "▲" : "▼"} {Math.abs(fund.change).toFixed(2)}%</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}><MiniChart prices={fund.chart} color={fund.color} /></div>
        {fund.id !== "G" && (
          <span style={{ fontSize: 9, letterSpacing: 1.5, padding: "3px 8px", borderRadius: 12, color: above ? "#00ff88" : "#ff4466", border: `1px solid ${above ? "#00ff8844" : "#ff446644"}` }}>
            {above ? "ABOVE" : "BELOW"} 200-DAY
          </span>
        )}
      </div>
      {open && (
        <div style={{ borderTop: "1px solid #1e293b", marginTop: 12, paddingTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 6 }}>
          {rows.map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
              <span style={{ color: "#475569" }}>{k}</span><span style={{ color: "#94a3b8" }}>{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
