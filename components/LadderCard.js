const UP = "#00ff88", DOWN = "#ff4466", AMBER = "#fbbf24", MUTED = "#64748b", TEXT = "#cbd5e1";
const usd = (v) => `$${v.toFixed(2)}`;

function Layer({ pct, title, detail, status, color }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 0", borderTop: "1px solid #1e293b" }}>
      <div style={{ minWidth: 46, fontSize: 18, fontWeight: 700, color }}>{pct}%</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", fontSize: 11, color: TEXT }}>
          <span>{title}</span>
          <span style={{ color, fontSize: 10, letterSpacing: 1 }}>{status}</span>
        </div>
        <div style={{ fontSize: 10, color: MUTED, marginTop: 3, lineHeight: 1.6 }}>{detail}</div>
      </div>
    </div>
  );
}

function legDetail(leg) {
  return leg.on
    ? <>In C since {leg.since}. {leg.n}-day average {usd(leg.average)}. Moves to G if C closes below <b style={{ color: "#e2e8f0" }}>{usd(leg.level)}</b> ({Math.abs(leg.pctToLevel).toFixed(1)}% below today).</>
    : <>In G since {leg.since}. {leg.n}-day average {usd(leg.average)}. Moves back to C if C closes above <b style={{ color: "#e2e8f0" }}>{usd(leg.level)}</b> ({Math.abs(leg.pctToLevel).toFixed(1)}% above today).</>;
}

export default function LadderCard({ ladder }) {
  if (!ladder) return null;
  const color = ladder.targetC >= 75 ? UP : ladder.targetC >= 40 ? AMBER : DOWN;
  const bt = ladder.backtest;
  const nextDown = [ladder.fast, ladder.slow].filter((l) => l.on).sort((a, b) => b.level - a.level)[0];
  const nextUp = [ladder.fast, ladder.slow].filter((l) => !l.on).sort((a, b) => a.level - b.level)[0];
  return (
    <div style={{ background: `${color}0a`, border: `1px solid ${color}40`, borderRadius: 12, padding: "20px 22px", marginBottom: 20 }}>
      <div style={{ fontSize: 9, color: MUTED, letterSpacing: 3, marginBottom: 10 }}>◈ YOUR PLAN · C FUND LADDER · AS OF {ladder.asOf}</div>
      <div style={{ display: "flex", gap: 18, alignItems: "baseline", flexWrap: "wrap" }}>
        <div style={{ fontSize: 30, fontWeight: 700, color, whiteSpace: "nowrap" }}>● {ladder.targetC}% C · {ladder.targetG}% G</div>
        <p style={{ flex: "1 1 260px", fontSize: 13, color: TEXT, lineHeight: 1.6, fontFamily: "Georgia, serif" }}>
          {ladder.targetSince ? `Target since ${ladder.targetSince}. ` : ""}
          {nextDown && `Next step down: ${nextDown.weightPct}% moves to G if C closes below ${usd(nextDown.level)} (${Math.abs(nextDown.pctToLevel).toFixed(1)}% below today).`}
          {nextDown && nextUp ? " " : ""}
          {nextUp && `Next step up: ${nextUp.weightPct}% moves back to C if C closes above ${usd(nextUp.level)}.`}
        </p>
      </div>

      <div style={{ marginTop: 14 }}>
        <Layer pct={ladder.floorPct} title="Always in C" status="FIXED" color={UP} detail="Keeps you invested through every switch; never moves." />
        <Layer pct={ladder.fast.weightPct} title={`Follows the ${ladder.fast.n}-day average (±${ladder.fast.bandPct}%)`} status={ladder.fast.on ? "IN C" : "IN G"} color={ladder.fast.on ? UP : DOWN} detail={legDetail(ladder.fast)} />
        <Layer pct={ladder.slow.weightPct} title={`Follows the ${ladder.slow.n}-day average (±${ladder.slow.bandPct}%), the action rule`} status={ladder.slow.on ? "IN C" : "IN G"} color={ladder.slow.on ? UP : DOWN} detail={legDetail(ladder.slow)} />
      </div>

      {ladder.recentChanges.length > 0 && (
        <div style={{ marginTop: 12, fontSize: 10, color: MUTED, lineHeight: 1.8, display: "flex", flexWrap: "wrap", columnGap: 12 }}>
          <span style={{ letterSpacing: 2, fontSize: 9, flexBasis: "100%" }}>RECENT STEPS</span>
          {ladder.recentChanges.slice(0, 6).map((c) => (
            <span key={c.date} style={{ whiteSpace: "nowrap" }}>
              {c.date} <span style={{ color: c.toC > c.fromC ? UP : DOWN }}>{c.fromC}→{c.toC}% C</span>
            </span>
          ))}
        </div>
      )}

      {bt && (
        <div style={{ marginTop: 10, fontSize: 10, color: MUTED, lineHeight: 1.7, borderTop: "1px solid #1e293b", paddingTop: 10 }}>
          Replayed on official prices since 2004 with TSP&apos;s transfer limits: {bt.cagr.toFixed(1)}% a year, worst drop {bt.maxDrawdown.toFixed(1)}%,
          worst 12 months {bt.worst12.toFixed(1)}%, about {Math.round(bt.movesPerYear)} transfers a year. Moves into G are always allowed;
          moves into C use one of your two transfers for the month. Backtest history, not a promise.
        </div>
      )}
    </div>
  );
}
