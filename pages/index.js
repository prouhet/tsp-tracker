import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import ActionRule from "../components/ActionRule";
import LadderCard from "../components/LadderCard";
import WatchTable from "../components/WatchTable";
import BacktestCard from "../components/BacktestCard";
import FundCard from "../components/FundCard";

const SHARE_KEY = "tsp_rule_share";

export default function Home() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [share, setShareState] = useState(100);
  const [aiInsight, setAiInsight] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);

  useEffect(() => {
    try { const v = parseInt(localStorage.getItem(SHARE_KEY), 10); if ([100, 75, 50, 25].includes(v)) setShareState(v); } catch {}
  }, []);
  const setShare = (v) => { setShareState(v); try { localStorage.setItem(SHARE_KEY, String(v)); } catch {} };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/signal");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load data");
      setData(json);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const getAIInsight = async () => {
    if (!data) return;
    setLoadingAI(true);
    setAiInsight("");
    const r = data.rule;
    const lines = [
      `Action rule as of ${r.asOf}: hold ${r.hold}. C Fund $${r.price.toFixed(2)}, 200-day average $${r.average.toFixed(2)} (${r.pctVsAverage.toFixed(1)}%). ` +
        `${r.hold === "C" ? `Sell trigger $${r.sellTrigger.toFixed(2)}` : `Buy trigger $${r.buyTrigger.toFixed(2)}`} (${r.pctToTrigger.toFixed(1)}% away). Signal since ${r.since}. Rule moves ${share}% of the balance.`,
      ...["C", "S", "I", "F"].map((id) => {
        const w = data.watch.funds[id];
        return `${id} weekly: ${w.vs40Week.toFixed(1)}% vs 40-wk avg, PPO ${w.ppo.up ? "up" : "down"}${w.ppo.turned ? " (turned this week)" : ""}, RSI ${w.rsi.value.toFixed(0)}, squeeze ${w.squeeze.up ? "positive" : "negative"}, Markov ${w.markov.state}, 26-wk return ${w.return26Week.toFixed(1)}%.`;
      }),
      `Leader among funds above trend: ${data.watch.leader || "none"}.`,
    ];
    try {
      const res = await fetch("/api/ai-insight", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ summary: lines.join("\n") }) });
      const j = await res.json();
      setAiInsight(j.insight || j.error || "No insight returned.");
    } catch {
      setAiInsight("Could not load AI insight.");
    }
    setLoadingAI(false);
  };

  return (
    <>
      <Head>
        <title>TSP Fund Signal Tracker</title>
        <meta name="description" content="One tested action rule for your TSP allocation, on official tsp.gov prices" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
      </Head>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #070d1a; color: #e2e8f0; }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
      <main style={{
        minHeight: "100vh", background: "#070d1a", padding: "32px 16px", fontFamily: "'Space Mono', monospace",
        backgroundImage: "radial-gradient(ellipse at 15% 15%, rgba(0,255,136,0.04) 0%, transparent 55%), radial-gradient(ellipse at 85% 85%, rgba(0,207,255,0.04) 0%, transparent 55%)",
      }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ marginBottom: 24, paddingBottom: 18, borderBottom: "1px solid #0f172a", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontSize: 9, color: "#475569", letterSpacing: 4, marginBottom: 6 }}>THRIFT SAVINGS PLAN</div>
              <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: -1 }}>FUND SIGNAL <span style={{ color: "#00ff88" }}>TRACKER</span></h1>
              <p style={{ fontSize: 11, color: "#475569", fontStyle: "italic", marginTop: 4 }}>200-day trend rule · weekly momentum watch · official TSP prices</p>
            </div>
            <div style={{ textAlign: "right" }}>
              {data && <div style={{ fontSize: 10, color: "#475569", marginBottom: 6 }}>PRICES AS OF {data.asOf}</div>}
              <button onClick={loadData} style={{ background: "transparent", border: "1px solid #1e293b", color: "#64748b", fontFamily: "inherit", fontSize: 10, padding: "6px 16px", borderRadius: 6, cursor: "pointer", letterSpacing: 2 }}>↺ REFRESH</button>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: 80, color: "#475569" }}>
              <div style={{ fontSize: 28, animation: "spin 1s linear infinite", display: "inline-block", marginBottom: 12 }}>◈</div>
              <div style={{ fontSize: 11, letterSpacing: 3 }}>LOADING OFFICIAL PRICES...</div>
            </div>
          ) : error ? (
            <div style={{ textAlign: "center", padding: 60, color: "#ff4466" }}>
              <div style={{ fontSize: 20, marginBottom: 8 }}>⚠</div>
              <div style={{ fontSize: 13 }}>{error}</div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 8 }}>No signal is shown rather than one built on guessed prices.</div>
              <button onClick={loadData} style={{ marginTop: 16, background: "transparent", border: "1px solid #ff4466", color: "#ff4466", fontFamily: "inherit", padding: "8px 20px", borderRadius: 6, cursor: "pointer" }}>Retry</button>
            </div>
          ) : (
            <>
              <LadderCard ladder={data.ladder} />
              <ActionRule rule={data.rule} share={share} setShare={setShare} stats={data.backtestByShare && data.backtestByShare[share]} />
              <WatchTable watch={data.watch} funds={data.funds} />

              <div style={{ marginBottom: 20 }}>
                <button onClick={getAIInsight} disabled={loadingAI} style={{
                  width: "100%", padding: "11px 0", borderRadius: 8, cursor: loadingAI ? "not-allowed" : "pointer",
                  background: "rgba(0,207,255,0.06)", border: "1px solid rgba(0,207,255,0.25)", color: loadingAI ? "#475569" : "#00cfff",
                  fontFamily: "inherit", fontSize: 11, letterSpacing: 2,
                }}>{loadingAI ? "◈ GENERATING AI SUMMARY..." : "◈ GET AI SUMMARY"}</button>
                {aiInsight && (
                  <div style={{ marginTop: 10, background: "rgba(0,207,255,0.04)", border: "1px solid rgba(0,207,255,0.15)", borderRadius: 8, padding: "16px 18px", animation: "fadeIn 0.4s ease" }}>
                    <p style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.8, fontFamily: "Georgia, serif" }}>{aiInsight}</p>
                  </div>
                )}
              </div>

              <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
                {data.funds.map((f) => <FundCard key={f.id} fund={f} watch={data.watch.funds[f.id]} rule={f.id === "C" ? data.rule : null} />)}
              </div>

              <BacktestCard bt={data.backtest} />

              <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #0f172a", fontSize: 10, color: "#334155", textAlign: "center", lineHeight: 1.8 }}>
                FOR EDUCATIONAL PURPOSES ONLY · NOT FINANCIAL ADVICE<br />
                PRICES ARE OFFICIAL TSP SHARE PRICES FROM TSP.GOV, UPDATED ONCE PER TRADING DAY · DATA FEED: /api/signal
                {data.data && (
                  <>
                    <br />
                    {data.data.storedThrough ? `HISTORY STORED THROUGH ${data.data.storedThrough} · ` : ""}
                    {data.data.error
                      ? "TSP.GOV UNREACHABLE, SHOWING STORED PRICES"
                      : data.data.downloaded
                        ? `NEW PRICES DOWNLOADED THROUGH ${data.data.through}`
                        : `CHECKED TSP.GOV, NO NEW PRICES SINCE ${data.data.through}`}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
