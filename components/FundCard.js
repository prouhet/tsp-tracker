import { useState } from "react";
import MiniChart from "./MiniChart";
import { ladderSteps, stepTrigger } from "./LadderCard";

const UP = "#00ff88", DOWN = "#ff4466", AMBER = "#fbbf24", MUTED = "#475569", TEXT = "#94a3b8";
const clamp = (x) => Math.max(-1, Math.min(1, x));
const money = (v) => (v == null ? "—" : `$${v.toFixed(2)}`);
const signed = (v, d = 1) => (v == null ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(d)}%`);

// A bar that grows right (green) or left (red) from the centre, so direction reads at a glance.
function CentreBar({ value }) {
  const v = clamp(value || 0);
  const w = Math.abs(v) * 50;
  return (
    <div style={{ position: "relative", height: 4, background: "#1e293b", borderRadius: 2, marginTop: 5 }}>
      <div style={{ position: "absolute", left: "50%", top: -2, width: 1, height: 8, background: "#334155" }} />
      <div style={{
        position: "absolute", top: 0, height: 4, borderRadius: 2, width: `${w}%`,
        left: v >= 0 ? "50%" : `${50 - w}%`, background: v >= 0 ? UP : DOWN,
      }} />
    </div>
  );
}

function SignalRow({ label, up, text, value, turned }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 10 }}>
        <span style={{ color: TEXT }}>
          {label}
          {turned && <span style={{ marginLeft: 6, fontSize: 8, color: AMBER, border: `1px solid ${AMBER}55`, borderRadius: 4, padding: "0 3px" }}>NEW THIS WEEK</span>}
        </span>
        <span style={{ color: up ? UP : DOWN }}>{up ? "▲" : "▼"} {text}</span>
      </div>
      <CentreBar value={value} />
    </div>
  );
}

function Level({ label, value, color }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, padding: "3px 0", borderBottom: "1px solid #0f172a" }}>
      <span style={{ color: MUTED }}>{label}</span>
      <span style={{ color: color || TEXT }}>{value}</span>
    </div>
  );
}

const heading = { fontSize: 9, color: "#64748b", letterSpacing: 2.5, marginBottom: 10 };

export default function FundCard({ fund, watch, ladder }) {
  const [open, setOpen] = useState(false);
  const up = fund.change >= 0;
  const above = fund.pctVs200 >= 0;
  const isG = fund.id === "G";
  const toggle = () => setOpen((o) => !o);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={open}
      onClick={toggle}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } }}
      style={{
        background: open ? `${fund.color}08` : "rgba(15,23,42,0.9)", border: `1px solid ${open ? fund.color + "44" : "#1e293b"}`,
        borderRadius: 12, padding: "16px 20px", cursor: "pointer", transition: "background 0.2s ease, border-color 0.2s ease", outline: "none",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: fund.color }}>{fund.id}</span>
          <span style={{ color: "#64748b", fontSize: 12, marginLeft: 10 }}>{fund.name}</span>
          <div style={{ color: MUTED, fontSize: 10, fontStyle: "italic", marginTop: 2 }}>{fund.desc} · official tsp.gov share price</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 18, color: "#e2e8f0" }}>${fund.price.toFixed(2)}</div>
          <div style={{ fontSize: 11, color: up ? UP : DOWN }}>{up ? "▲" : "▼"} {Math.abs(fund.change).toFixed(2)}%</div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}><MiniChart prices={fund.chart} color={fund.color} /></div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          {!isG && (
            <span style={{ fontSize: 9, letterSpacing: 1.5, padding: "3px 8px", borderRadius: 12, color: above ? UP : DOWN, border: `1px solid ${above ? UP : DOWN}44`, whiteSpace: "nowrap" }}>
              {above ? "ABOVE" : "BELOW"} 200-DAY
            </span>
          )}
          {!isG && watch && (
            <span style={{ fontSize: 9, letterSpacing: 1, color: watch.upCount >= 4 ? UP : watch.upCount <= 1 ? DOWN : AMBER, whiteSpace: "nowrap" }}>
              {watch.upCount}/5 WEEKLY UP
            </span>
          )}
          <span style={{ fontSize: 9, color: "#334155" }}>{open ? "▲ LESS" : "▼ DETAILS"}</span>
        </div>
      </div>

      {open && (
        <div onClick={(e) => e.stopPropagation()} style={{ borderTop: "1px solid #1e293b", marginTop: 12, paddingTop: 14, cursor: "default" }}>
          {ladder && (() => {
            const { down, up } = ladderSteps(ladder);
            const color = ladder.targetC >= 75 ? UP : ladder.targetC >= 35 ? AMBER : DOWN;
            return (
              <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 8, border: `1px solid ${color}33`, background: "rgba(2,6,23,0.5)", fontSize: 11, color: TEXT, lineHeight: 1.7 }}>
                <span style={{ color, fontWeight: 700 }}>YOUR PLAN: {ladder.targetC}% C · {ladder.targetG}% G</span>{ladder.targetSince ? ` since ${ladder.targetSince}.` : "."}
                {down.map((s, i) => (
                  <div key={s.name}>{i === 0 ? "Next step down" : "Then"}: when {stepTrigger(s).main} ({stepTrigger(s).note}), move {i === 0 ? "" : "another "}{s.weightPct}% to G → {s.toC}% C · {s.toG}% G.</div>
                ))}
                {up.map((s, i) => (
                  <div key={s.name}>{i === 0 ? "Next step up" : "Then"}: when {stepTrigger(s).main} ({stepTrigger(s).note}), move {i === 0 ? "" : "another "}{s.weightPct}% to C → {s.toC}% C · {s.toG}% G.</div>
                ))}
              </div>
            );
          })()}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 22 }}>
            {!isG && watch && (
              <div>
                <div style={heading}>WEEKLY SIGNALS · WEEK ENDING {watch.weekEnding}</div>
                <SignalRow label="Trend vs 40-week average" up={watch.trendUp} text={signed(watch.vs40Week)} value={watch.vs40Week / 10} />
                <SignalRow label="PPO histogram (12, 26, 9)" up={watch.ppo.up} text={watch.ppo.hist.toFixed(2)} value={watch.ppo.hist} turned={watch.ppo.turned} />
                <SignalRow label="RSI 14 (weekly)" up={watch.rsi.up} text={watch.rsi.value.toFixed(0)} value={(watch.rsi.value - 50) / 30} turned={watch.rsi.turned} />
                <SignalRow label="Squeeze momentum" up={watch.squeeze.up} text={`${watch.squeeze.up ? "positive" : "negative"}, ${watch.squeeze.rising ? "rising" : "falling"}`} value={(watch.squeeze.value / fund.price) * 100 / 3} turned={watch.squeeze.turned} />
                <SignalRow
                  label="Markov regime (20-week)"
                  up={watch.markov.up}
                  text={`${watch.markov.state || "—"}${watch.markov.pBull != null ? ` · up ${Math.round(watch.markov.pBull * 100)}% / down ${Math.round(watch.markov.pBear * 100)}%` : ""}`}
                  value={watch.markov.pBull != null ? watch.markov.pBull - watch.markov.pBear : 0}
                />
                <div style={{ fontSize: 9, color: MUTED, lineHeight: 1.6, marginTop: 2 }}>Context only: switching on these returned less than the action rule.</div>
              </div>
            )}

            <div>
              <div style={heading}>KEY LEVELS</div>
              {!isG && <Level label="20-day average" value={money(fund.sma20)} />}
              {!isG && <Level label="50-day average" value={money(fund.sma50)} />}
              {!isG && <Level label="200-day average" value={money(fund.sma200)} />}
              {!isG && <Level label="vs 200-day" value={signed(fund.pctVs200)} color={above ? UP : DOWN} />}
              {!isG && <Level label="RSI 14 (daily)" value={fund.rsi14 != null ? fund.rsi14.toFixed(1) : "—"} />}
              {!isG && <Level label="20-day high / low" value={`${money(fund.high20)} / ${money(fund.low20)}`} />}
              {!isG && <Level label="Volatility (20-day, annualized)" value={fund.vol20 != null ? `${fund.vol20.toFixed(1)}%` : "—"} />}
              {!isG && watch && <Level label="26-week return" value={signed(watch.return26Week)} color={watch.return26Week >= 0 ? TEXT : DOWN} />}
              <Level label="1-year return" value={signed(fund.return1y)} color={fund.return1y >= 0 ? TEXT : DOWN} />
              {isG && <div style={{ fontSize: 10, color: MUTED, lineHeight: 1.6, marginTop: 8 }}>G is backed by the U.S. government and never loses value, so it has no trend signals. It's where the rule waits after C closes more than 3% below its 200-day average.</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
