const UP = "#00ff88", DOWN = "#ff4466", AMBER = "#fbbf24", MUTED = "#64748b", TEXT = "#cbd5e1";
const usd = (v) => `$${v.toFixed(2)}`;

// The order the plan would step from today: lines that are in C step down from the highest
// trigger first; lines that are out step up from the lowest trigger first. Totals are cumulative.
export function ladderSteps(ladder) {
  const legs = [
    { name: `${ladder.fast.n}-day`, ...ladder.fast },
    { name: `${ladder.slow.n}-day`, ...ladder.slow },
  ];
  let c = ladder.targetC;
  // an armed step is already past its price level, so it comes first
  const rank = (l) => (l.armed ? Infinity : l.level);
  const down = legs.filter((l) => l.on).sort((a, b) => rank(b) - rank(a)).map((l) => {
    c -= l.weightPct;
    return { ...l, dir: "down", toC: c, toG: 100 - c };
  });
  c = ladder.targetC;
  const up = legs.filter((l) => !l.on).sort((a, b) => a.level - b.level).map((l) => {
    c += l.weightPct;
    return { ...l, dir: "up", toC: c, toG: 100 - c };
  });
  return { down, up };
}

// What has to happen for a step, in words (used by the plan card and the C fund card).
export function stepTrigger(s) {
  if (s.dir === "up") return { main: <>C closes above <b style={{ color: "#e2e8f0" }}>{usd(s.level)}</b></>, note: `${Math.abs(s.pctToLevel).toFixed(1)}% above today` };
  if (s.armed) return { main: <>volatility reaches <b style={{ color: "#e2e8f0" }}>{s.calmVolPct}%</b></>, note: `now ${s.vol.toFixed(1)}%; C already below ${usd(s.exitLevel)}` };
  if (s.calmVolPct != null) return { main: <>C closes below <b style={{ color: "#e2e8f0" }}>{usd(s.level)}</b> with volatility {s.calmVolPct}%+</>, note: `${Math.abs(s.pctToLevel).toFixed(1)}% below today; volatility now ${s.vol.toFixed(1)}%` };
  return { main: <>C closes below <b style={{ color: "#e2e8f0" }}>{usd(s.level)}</b></>, note: `${Math.abs(s.pctToLevel).toFixed(1)}% below today` };
}

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

const B = ({ children }) => <b style={{ color: "#e2e8f0" }}>{children}</b>;
function legDetail(leg) {
  if (!leg.on) return <>In G since {leg.since}. {leg.n}-day average {usd(leg.average)}. This {leg.weightPct}% moves back to C if C closes above <B>{usd(leg.level)}</B>.</>;
  if (leg.armed) return <>C closed below the exit level ({usd(leg.exitLevel)}) on {leg.armedSince}, but volatility is {leg.vol.toFixed(1)}%, under {leg.calmVolPct}%, so this {leg.weightPct}% stays in C for now. It moves to G at the first close with volatility <B>{leg.calmVolPct}%+</B>, unless C first closes back above <B>{usd(leg.backLevel)}</B>.</>;
  if (leg.calmVolPct != null) return <>In C since {leg.since}. {leg.n}-day average {usd(leg.average)}. This {leg.weightPct}% moves to G if C closes below <B>{usd(leg.level)}</B> while volatility is <B>{leg.calmVolPct}%+</B> (now {leg.vol.toFixed(1)}%). Below {leg.calmVolPct}% the plan waits for volatility to confirm the drop.</>;
  return <>In C since {leg.since}. {leg.n}-day average {usd(leg.average)}. This {leg.weightPct}% moves to G if C closes below <B>{usd(leg.level)}</B>.</>;
}
const legStatus = (leg) => (!leg.on ? "IN G" : leg.armed ? "IN C · ARMED" : "IN C");
const legColor = (leg) => (!leg.on ? DOWN : leg.armed ? AMBER : UP);

export default function LadderCard({ ladder }) {
  if (!ladder) return null;
  const color = ladder.targetC >= 75 ? UP : ladder.targetC >= 35 ? AMBER : DOWN;
  const bt = ladder.backtest;
  const { down, up } = ladderSteps(ladder);
  const stepRow = (s, i, first) => (
    <div key={s.name} style={{ display: "flex", gap: 10, alignItems: "baseline", fontSize: 11, color: TEXT, padding: "3px 0" }}>
      <span style={{ color: s.dir === "down" ? DOWN : UP, minWidth: 16 }}>{i + 1}.</span>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexWrap: "wrap", columnGap: 10, justifyContent: "space-between" }}>
        <span>
          {stepTrigger(s).main} <span style={{ color: MUTED }}>({stepTrigger(s).note})</span>
        </span>
        <span>
          {first ? "move" : "move another"} {s.weightPct}% {s.dir === "down" ? "to G" : "to C"} → <b style={{ color: s.dir === "down" ? DOWN : UP, whiteSpace: "nowrap" }}>{s.toC}% C · {s.toG}% G</b>
        </span>
      </div>
    </div>
  );

  return (
    <div style={{ background: `${color}0a`, border: `1px solid ${color}40`, borderRadius: 12, padding: "20px 22px", marginBottom: 20 }}>
      <div style={{ fontSize: 9, color: MUTED, letterSpacing: 3, marginBottom: 10 }}>◈ YOUR PLAN · C FUND LADDER · AS OF {ladder.asOf}</div>
      <div style={{ display: "flex", gap: 18, alignItems: "baseline", flexWrap: "wrap" }}>
        <div style={{ fontSize: 30, fontWeight: 700, color, whiteSpace: "nowrap" }}>● {ladder.targetC}% C · {ladder.targetG}% G</div>
        <div style={{ fontSize: 12, color: MUTED }}>{ladder.targetSince ? `target since ${ladder.targetSince}` : ""}</div>
      </div>

      {(down.length > 0 || up.length > 0) && (
        <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 8, background: "rgba(2,6,23,0.5)", border: "1px solid #1e293b" }}>
          {down.length > 0 && <div style={{ fontSize: 9, color: MUTED, letterSpacing: 2, marginBottom: 4 }}>STEPS DOWN FROM HERE</div>}
          {down.map((s, i) => stepRow(s, i, i === 0))}
          {up.length > 0 && <div style={{ fontSize: 9, color: MUTED, letterSpacing: 2, margin: down.length ? "8px 0 4px" : "0 0 4px" }}>STEPS BACK UP</div>}
          {up.map((s, i) => stepRow(s, i, i === 0))}
          <div style={{ fontSize: 10, color: MUTED, marginTop: 6 }}>The last {ladder.floorPct}% always stays in C.</div>
        </div>
      )}

      <div style={{ marginTop: 14 }}>
        <Layer pct={ladder.floorPct} title="Always in C" status="FIXED" color={UP} detail="Keeps you invested through every switch; never moves." />
        <Layer pct={ladder.fast.weightPct} title={`Follows the ${ladder.fast.n}-day average (±${ladder.fast.bandPct}%)${ladder.fast.calmVolPct != null ? `; sells only at ${ladder.fast.calmVolPct}%+ volatility` : ""}`} status={legStatus(ladder.fast)} color={legColor(ladder.fast)} detail={legDetail(ladder.fast)} />
        <Layer pct={ladder.slow.weightPct} title={`Follows the ${ladder.slow.n}-day average (±${ladder.slow.bandPct}%)`} status={legStatus(ladder.slow)} color={legColor(ladder.slow)} detail={legDetail(ladder.slow)} />
      </div>

      {ladder.recentChanges.length > 0 && (
        <div style={{ marginTop: 12, fontSize: 10, color: MUTED, lineHeight: 1.8, display: "flex", flexWrap: "wrap", columnGap: 12 }}>
          <span style={{ letterSpacing: 2, fontSize: 9, flexBasis: "100%" }}>RECENT STEPS (SIGNAL DATES)</span>
          {ladder.recentChanges.slice(0, 6).map((c) => (
            <span key={c.date} style={{ whiteSpace: "nowrap" }}>
              {c.date} <span style={{ color: c.toC > c.fromC ? UP : DOWN }}>{c.fromC}→{c.toC}% C</span>
            </span>
          ))}
        </div>
      )}

      {bt && (
        <div style={{ marginTop: 10, fontSize: 10, color: MUTED, lineHeight: 1.7, borderTop: "1px solid #1e293b", paddingTop: 10 }}>
          Moves into G are always allowed; moves into C use one of your two transfers for the month. A transfer requested before noon ET
          gets that day&apos;s close. Since 2004 this plan returned {bt.cagr.toFixed(1)}% a year with a worst drop of {bt.maxDrawdown.toFixed(1)}% (backtest below).
        </div>
      )}
    </div>
  );
}
