const UP = "#00ff88", AMBER = "#fbbf24", DOWN = "#ff4466", MUTED = "#64748b", TEXT = "#cbd5e1";
const ZONE_COLOR = { calm: UP, normal: "#86efac", elevated: AMBER, stressed: "#fb923c", panic: DOWN };
const SCALE_MAX = 45; // the bar runs 0–45%; anything above sits at the right edge
const FUND_COLOR = { C: "#00ff88", S: "#00cfff", I: "#a78bfa" };
const pct = (v, d = 0) => `${v.toFixed(d)}%`;

function ZoneBar({ v, zones }) {
  const x = (n) => `${(Math.min(n, SCALE_MAX) / SCALE_MAX) * 100}%`;
  return (
    <div style={{ position: "relative", marginTop: 14, marginBottom: 22 }}>
      <div style={{ display: "flex", height: 10, borderRadius: 5, overflow: "hidden" }}>
        {zones.map((z) => (
          <div key={z.id} title={`${z.label} ${z.lo}${z.hi ? `–${z.hi}` : "+"}%`}
            style={{ width: `${((Math.min(z.hi ?? SCALE_MAX, SCALE_MAX) - z.lo) / SCALE_MAX) * 100}%`, background: `${ZONE_COLOR[z.id]}55` }} />
        ))}
      </div>
      <div style={{ position: "absolute", top: -4, left: x(v), transform: "translateX(-50%)", width: 4, height: 18, borderRadius: 2, background: "#e2e8f0", boxShadow: "0 0 0 2px #070d1a" }} />
      {zones.slice(1).map((z) => (
        <div key={z.id} style={{ position: "absolute", top: 14, left: x(z.lo), transform: "translateX(-50%)", fontSize: 9, color: MUTED }}>{z.lo}</div>
      ))}
    </div>
  );
}

export default function VolGauge({ vol, ladder }) {
  if (!vol) return null;
  const zone = vol.zones.find((z) => z.id === vol.zone);
  const color = ZONE_COLOR[vol.zone];
  const fc = vol.fastCrash;
  const calm = vol.fastExits.calm, busy = vol.fastExits.busy;
  const c = vol.funds.find((f) => f.id === "C");

  return (
    <div style={{ background: "rgba(15,23,42,0.9)", border: `1px solid ${fc.on ? DOWN + "88" : "#1e293b"}`, borderRadius: 12, padding: "18px 20px", marginBottom: 20 }}>
      <div style={{ fontSize: 9, color: MUTED, letterSpacing: 3, marginBottom: 10 }}>◈ VOLATILITY GAUGE · C FUND · AS OF {vol.asOf}</div>
      <div style={{ display: "flex", gap: 16, alignItems: "baseline", flexWrap: "wrap" }}>
        <div style={{ fontSize: 26, fontWeight: 700, color, whiteSpace: "nowrap" }}>{pct(vol.vol, 1)} · {vol.zoneLabel}</div>
        <div style={{ fontSize: 11, color: MUTED }}>usual: {pct(c.median, 1)} · calmer than {Math.round(100 - c.percentile)}% of days since {vol.since.slice(0, 4)}</div>
      </div>
      <div style={{ fontSize: 11, color: TEXT, marginTop: 8, lineHeight: 1.7, fontFamily: "Georgia, serif" }}>
        From the {zone.label.toLowerCase()} zone, C had a {vol.dropPct}%+ drop within 3 months {pct(zone.dropOddsPct)} of the time
        (all days: {pct(vol.overallDropOddsPct)}) and was higher 3 months later {pct(zone.upPct)} of the time.
      </div>

      <ZoneBar v={vol.vol} zones={vol.zones} />

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, minWidth: 300 }}>
          <thead>
            <tr style={{ color: MUTED, fontSize: 9, letterSpacing: 1 }}>
              {["ZONE", "C VOLATILITY", "SHARE OF DAYS", `${vol.dropPct}%+ DROP IN 3 MO`, "HIGHER 3 MO LATER"].map((h) => (
                <th key={h} style={{ padding: "5px 4px", textAlign: h === "ZONE" ? "left" : "right", borderBottom: "1px solid #1e293b", fontWeight: 400 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vol.zones.map((z) => {
              const here = z.id === vol.zone;
              return (
                <tr key={z.id} style={{ background: here ? `${ZONE_COLOR[z.id]}12` : "transparent", color: here ? "#e2e8f0" : "#94a3b8" }}>
                  <td style={{ padding: "5px 4px", color: ZONE_COLOR[z.id], whiteSpace: "nowrap" }}>{here ? "▶ " : ""}{z.label}</td>
                  <td style={{ padding: "5px 4px", textAlign: "right", whiteSpace: "nowrap" }}>{z.hi ? `${z.lo}–${z.hi}%` : `${z.lo}%+`}</td>
                  <td style={{ padding: "5px 4px", textAlign: "right" }}>{pct(z.sharePct)}</td>
                  <td style={{ padding: "5px 4px", textAlign: "right" }}>{z.dropOddsPct == null ? "—" : pct(z.dropOddsPct)}</td>
                  <td style={{ padding: "5px 4px", textAlign: "right" }}>{z.upPct == null ? "—" : pct(z.upPct)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 9, color: MUTED, marginTop: 6, lineHeight: 1.6 }}>
        Official C prices since {vol.since}. Stressed readings often come after a drop has already happened, when big rebounds are common too.
      </div>

      <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
        <div style={{ fontSize: 10, color: TEXT, lineHeight: 1.7, padding: "8px 10px", borderRadius: 8, border: "1px solid #1e293b", background: "rgba(2,6,23,0.5)" }}>
          <b style={{ color: vol.vol < vol.calmLevel ? UP : AMBER }}>50-DAY STEP NEEDS {vol.calmLevel}%+:</b>{" "}
          The plan moves the {ladder ? ladder.fast.weightPct : 25}% to G only when C breaks below its 50-day exit level with volatility at {vol.calmLevel}% or more
          (now {vol.vol.toFixed(1)}%{vol.vol < vol.calmLevel ? ", so a break today would wait" : ""}). Since 2004, selling at the break paid off {calm.helped} of {calm.n} times when
          volatility was under {vol.calmLevel}% and {busy.helped} of {busy.n} times above it: in a calm market a break has usually been noise.
        </div>
        <div style={{ fontSize: 10, color: fc.on ? "#fecdd3" : TEXT, lineHeight: 1.7, padding: "8px 10px", borderRadius: 8, border: `1px solid ${fc.on ? DOWN + "88" : "#1e293b"}`, background: fc.on ? "rgba(255,68,102,0.08)" : "rgba(2,6,23,0.5)" }}>
          <b style={{ color: fc.on ? DOWN : MUTED }}>FAST-CRASH FLAG: {fc.on ? "ON" : "OFF"}.</b>{" "}
          {fc.on
            ? `Volatility is above ${fc.level}% with C under its 50-day average while the ${ladder ? ladder.slow.weightPct : 65}% is still in C. In Covid this came a week before the 200-day step. Moving the ${ladder ? ladder.slow.weightPct : 65}% to G early is allowed any time; the plan doesn't require it.`
            : `Turns on when volatility tops ${fc.level}% while C is under its 50-day average and the ${ladder ? ladder.slow.weightPct : 65}% is still in C (Covid: Mar 2, 2020, a week before the 200-day step). Now: volatility ${fc.volAbove ? "above" : "below"} ${fc.level}%, C ${fc.belowAverage50 ? "below" : "above"} its 50-day average.`}
        </div>
      </div>

      <div style={{ marginTop: 14, fontSize: 9, color: MUTED, letterSpacing: 2, marginBottom: 6 }}>C VS S VS I</div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, minWidth: 300 }}>
          <thead>
            <tr style={{ color: MUTED, fontSize: 9, letterSpacing: 1 }}>
              {["FUND", "VOLATILITY NOW", "USUAL", `RETURN/YR SINCE ${vol.since.slice(0, 4)}`, "RETURN PER UNIT OF RISK"].map((h) => (
                <th key={h} style={{ padding: "5px 4px", textAlign: h === "FUND" ? "left" : "right", borderBottom: "1px solid #1e293b", fontWeight: 400 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vol.funds.map((f) => (
              <tr key={f.id} style={{ color: "#94a3b8" }}>
                <td style={{ padding: "5px 4px", color: FUND_COLOR[f.id], fontWeight: 700 }}>{f.id}</td>
                <td style={{ padding: "5px 4px", textAlign: "right", color: f.now > f.median ? AMBER : TEXT }}>{pct(f.now, 1)}</td>
                <td style={{ padding: "5px 4px", textAlign: "right" }}>{pct(f.median, 1)}</td>
                <td style={{ padding: "5px 4px", textAlign: "right" }}>{pct(f.cagrPct, 1)}</td>
                <td style={{ padding: "5px 4px", textAlign: "right" }}>{f.returnPerRisk.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 9, color: MUTED, marginTop: 6, lineHeight: 1.6 }}>
        Volatility: how much the price has swung day to day over the last 20 trading days, annualized. Return per unit of risk: return above G divided by long-run volatility.
        Picking S or I by lower volatility or better risk-adjusted momentum returned less than staying in C.
      </div>
    </div>
  );
}
