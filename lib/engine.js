// Signal engine: the action rule, its backtest, and the weekly momentum watch.
// Everything here is a pure function of official TSP closing prices.

export const FUNDS = [
  { id: "C", name: "C Fund", desc: "S&P 500 index", color: "#00ff88" },
  { id: "S", name: "S Fund", desc: "Small & mid-cap index", color: "#00cfff" },
  { id: "I", name: "I Fund", desc: "International index", color: "#a78bfa" },
  { id: "F", name: "F Fund", desc: "Bond index", color: "#fbbf24" },
  { id: "G", name: "G Fund", desc: "Government securities", color: "#94a3b8" },
];

// The action rule. Chosen after testing ~45 alternatives (all-fund rotation,
// value buying, PPO/RSI/Squeeze/Markov triggers, daily vs weekly) on official
// prices since 2004; none beat it on return and drawdown together.
export const RULE = {
  fund: "C",
  n: 200, // trading-day average
  band: 0.03, // must close 3% through the average to flip
  backtestStart: "2004-03-18", // first day with a full 200-day history
  iftsPerMonth: 2,
  adopted: "2026-10-11",
};

// ---------- basic series helpers ----------
export function smaSeries(v, n) {
  const out = new Array(v.length).fill(null);
  let s = 0;
  for (let i = 0; i < v.length; i++) {
    s += v[i];
    if (i >= n) s -= v[i - n];
    if (i >= n - 1) out[i] = s / n;
  }
  return out;
}

function emaSeries(v, n) {
  const k = 2 / (n + 1);
  const out = [];
  let e = v[0];
  for (let i = 0; i < v.length; i++) {
    e = i ? v[i] * k + e * (1 - k) : v[0];
    out.push(e);
  }
  return out;
}

function rsiSeries(v, n = 14) {
  const out = new Array(v.length).fill(null);
  let ag = 0, al = 0;
  for (let i = 1; i < v.length; i++) {
    const ch = v[i] - v[i - 1];
    const g = Math.max(ch, 0), l = Math.max(-ch, 0);
    if (i <= n) { ag += g / n; al += l / n; } else { ag = (ag * (n - 1) + g) / n; al = (al * (n - 1) + l) / n; }
    if (i >= n) out[i] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
  }
  return out;
}

// LazyBear-style Squeeze Momentum value using closes only (TSP publishes no highs/lows)
function squeezeSeries(v, L = 20) {
  const n = v.length, s = smaSeries(v, L), x = new Array(n).fill(null), out = new Array(n).fill(null);
  for (let j = L - 1; j < n; j++) {
    let hh = -Infinity, ll = Infinity;
    for (let k = j - L + 1; k <= j; k++) { hh = Math.max(hh, v[k]); ll = Math.min(ll, v[k]); }
    x[j] = v[j] - ((hh + ll) / 2 + s[j]) / 2;
  }
  for (let j = 2 * L - 2; j < n; j++) {
    let sx = 0, sy = 0, sxy = 0, sxx = 0;
    for (let k = 0; k < L; k++) { const y = x[j - L + 1 + k]; sx += k; sy += y; sxy += k * y; sxx += k * k; }
    const slope = (L * sxy - sx * sy) / (L * sxx - sx * sx);
    out[j] = (sy - slope * sx) / L + slope * (L - 1);
  }
  return out;
}

// Markov regime: state from 20-bar return (>= +5% bull, <= -5% bear, else sideways),
// running transition counts, no lookahead.
function markovSeries(v, L = 20, th = 0.05) {
  const out = new Array(v.length).fill(null);
  const cnt = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  let prev = null;
  for (let j = L; j < v.length; j++) {
    const r = v[j] / v[j - L] - 1;
    const s = r >= th ? 2 : r <= -th ? 0 : 1;
    if (prev !== null) cnt[prev][s]++;
    const tot = cnt[s][0] + cnt[s][1] + cnt[s][2];
    out[j] = { state: ["bear", "sideways", "bull"][s], pBull: tot ? cnt[s][2] / tot : null, pBear: tot ? cnt[s][0] / tot : null };
    prev = s;
  }
  return out;
}

// ---------- the action rule ----------
export function trendSeries(closes, n = RULE.n, band = RULE.band) {
  const sma = smaSeries(closes, n);
  const on = new Array(closes.length).fill(null);
  let st = null;
  for (let i = n - 1; i < closes.length; i++) {
    const p = closes[i], s = sma[i];
    st = st === null ? p > s : p > s * (1 + band) ? true : p < s * (1 - band) ? false : st;
    on[i] = st;
  }
  return { sma, on };
}

export function currentRule(rows) {
  const closes = rows.map((r) => r[RULE.fund]);
  const { sma, on } = trendSeries(closes);
  const last = rows.length - 1;
  const flips = [];
  for (let i = RULE.n; i < rows.length; i++) {
    if (on[i] !== on[i - 1]) flips.push({ date: rows[i].d, to: on[i] ? RULE.fund : "G" });
  }
  const price = closes[last], avg = sma[last];
  return {
    hold: on[last] ? RULE.fund : "G",
    state: on[last] ? "IN" : "OUT",
    asOf: rows[last].d,
    price,
    average: avg,
    pctVsAverage: (price / avg - 1) * 100,
    sellTrigger: avg * (1 - RULE.band),
    buyTrigger: avg * (1 + RULE.band),
    pctToTrigger: on[last] ? (avg * (1 - RULE.band) / price - 1) * 100 : (avg * (1 + RULE.band) / price - 1) * 100,
    since: flips.length ? flips[flips.length - 1].date : rows[RULE.n - 1].d,
    flipCount: flips.length,
    recentFlips: flips.slice(-12).reverse(),
    params: RULE,
  };
}

// Replays the rule from RULE.backtestStart: acts at the close after each signal and
// obeys TSP's two-unrestricted-transfers-per-month limit (further moves only into G).
// share = fraction of the balance the rule moves to G when it says OUT.
export function backtest(rows, share = 1) {
  const N = rows.length;
  const { on } = trendSeries(rows.map((r) => r[RULE.fund]));
  const s0 = rows.findIndex((r) => r.d >= RULE.backtestStart);
  if (s0 < 0 || s0 >= N - 1) return null;
  const target = (st) => (st ? 1 : 1 - share); // fraction in C
  let cur = target(on[s0]);
  let vC = 10000 * cur, vG = 10000 * (1 - cur);
  let pending = null, month = "", mCount = 0, trades = 0, peak = 10000, mdd = 0, timeInG = 0;
  const hold = { C: 10000, G: 10000 }, holdPeak = { C: 10000 }, holdMdd = { C: 0 };
  const curve = [{ d: rows[s0].d, rule: 10000, C: 10000, G: 10000 }];
  const switches = [];
  const yearEnd = {};
  for (let i = s0 + 1; i < N; i++) {
    const rc = rows[i].C / rows[i - 1].C, rg = rows[i].G / rows[i - 1].G;
    vC *= rc; vG *= rg; hold.C *= rc; hold.G *= rg;
    const tot = vC + vG;
    const mo = rows[i].d.slice(0, 7);
    if (mo !== month) { month = mo; mCount = 0; }
    if (pending !== null && Math.abs(pending - cur) > 1e-9) {
      const intoG = pending < cur;
      if (mCount < RULE.iftsPerMonth || intoG) {
        vC = tot * pending; vG = tot * (1 - pending);
        switches.push({ date: rows[i].d, to: pending === 1 ? "C" : share === 1 ? "G" : `${Math.round((1 - pending) * 100)}% G` });
        cur = pending; trades++; mCount++;
      }
    }
    pending = null;
    timeInG += 1 - cur;
    peak = Math.max(peak, tot); mdd = Math.min(mdd, tot / peak - 1);
    holdPeak.C = Math.max(holdPeak.C, hold.C); holdMdd.C = Math.min(holdMdd.C, hold.C / holdPeak.C - 1);
    if (i % 5 === 0 || i === N - 1) curve.push({ d: rows[i].d, rule: tot, C: hold.C, G: hold.G });
    yearEnd[rows[i].d.slice(0, 4)] = { rule: tot, C: hold.C, G: hold.G };
    const t = target(on[i]);
    if (Math.abs(t - cur) > 1e-9) pending = t;
  }
  const years = (new Date(rows[N - 1].d) - new Date(rows[s0].d)) / (365.25 * 864e5);
  const cagr = (v) => Math.pow(v / 10000, 1 / years) - 1;
  const annual = [];
  let prev = { rule: 10000, C: 10000, G: 10000 };
  for (const y of Object.keys(yearEnd).sort()) {
    const e = yearEnd[y];
    annual.push({ year: y, rule: e.rule / prev.rule - 1, C: e.C / prev.C - 1, G: e.G / prev.G - 1 });
    prev = e;
  }
  const days = N - 1 - s0;
  return {
    start: rows[s0].d, end: rows[N - 1].d, years, share,
    rule: { final: vC + vG, cagr: cagr(vC + vG), maxDrawdown: mdd, switches: trades, timeInG: timeInG / days },
    holdC: { final: hold.C, cagr: cagr(hold.C), maxDrawdown: holdMdd.C },
    holdG: { final: hold.G, cagr: cagr(hold.G) },
    annual: annual.reverse(),
    switches: switches.reverse(),
    curve,
  };
}

// ---------- weekly momentum watch (heads-up, not the trigger) ----------
function weeklyIndex(rows) {
  const wk = (d) => {
    const t = new Date(d + "T12:00:00Z");
    t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7));
    return t.toISOString().slice(0, 10);
  };
  const idx = [];
  for (let i = 0; i < rows.length; i++) if (i === rows.length - 1 || wk(rows[i + 1].d) !== wk(rows[i].d)) idx.push(i);
  return idx;
}

export function weeklyWatch(rows) {
  const wi = weeklyIndex(rows);
  const j = wi.length - 1;
  const out = {};
  for (const { id } of FUNDS) {
    const c = wi.map((i) => rows[i][id]);
    const e12 = emaSeries(c, 12), e26 = emaSeries(c, 26);
    const ppo = c.map((_, k) => ((e12[k] - e26[k]) / e26[k]) * 100);
    const sig = emaSeries(ppo, 9);
    const hist = ppo.map((p, k) => p - sig[k]);
    const rsi = rsiSeries(c), sqz = squeezeSeries(c), mk = markovSeries(c), s40 = smaSeries(c, 40);
    const ppoUp = hist[j] > 0, rsiUp = rsi[j] > 50, sqzUp = sqz[j] > 0;
    const mkUp = mk[j] && mk[j].pBull !== null ? mk[j].pBull > mk[j].pBear : false;
    const trendUp = c[j] > s40[j];
    out[id] = {
      weekEnding: rows[wi[j]].d,
      vs40Week: (c[j] / s40[j] - 1) * 100,
      return26Week: (c[j] / c[Math.max(0, j - 26)] - 1) * 100,
      ppo: { hist: hist[j], up: ppoUp, turned: ppoUp !== hist[j - 1] > 0 },
      rsi: { value: rsi[j], up: rsiUp, turned: rsiUp !== rsi[j - 1] > 50 },
      squeeze: { value: sqz[j], up: sqzUp, rising: sqz[j] > sqz[j - 1], turned: sqzUp !== sqz[j - 1] > 0 },
      markov: { ...(mk[j] || {}), up: mkUp },
      trendUp,
      upCount: [ppoUp, rsiUp, sqzUp, mkUp, trendUp].filter(Boolean).length,
    };
  }
  const contenders = ["C", "S", "I", "F"].filter((f) => out[f].trendUp);
  const leader = contenders.length ? contenders.reduce((a, b) => (out[b].return26Week > out[a].return26Week ? b : a)) : null;
  return { funds: out, leader };
}

// ---------- per-fund daily snapshot for the cards ----------
export function fundSnapshots(rows) {
  const last = rows.length - 1;
  return FUNDS.map((f) => {
    const c = rows.map((r) => r[f.id]);
    const s20 = smaSeries(c, 20), s50 = smaSeries(c, 50), s200 = smaSeries(c, 200), rsi = rsiSeries(c);
    const chart = rows.slice(-130).map((r) => ({ date: r.d, close: r[f.id] }));
    const last20 = c.slice(-20);
    const logR = c.slice(-21).slice(1).map((v, k) => Math.log(v / c[c.length - 21 + k]));
    const meanR = logR.reduce((a, b) => a + b, 0) / logR.length;
    const vol20 = Math.sqrt(logR.reduce((a, b) => a + (b - meanR) ** 2, 0) / (logR.length - 1)) * Math.sqrt(252) * 100;
    return {
      ...f,
      date: rows[last].d,
      price: c[last],
      change: (c[last] / c[last - 1] - 1) * 100,
      sma20: s20[last],
      high20: Math.max(...last20),
      low20: Math.min(...last20),
      vol20,
      sma50: s50[last],
      sma200: s200[last],
      pctVs200: (c[last] / s200[last] - 1) * 100,
      rsi14: rsi[last],
      return1y: (c[last] / c[Math.max(0, last - 252)] - 1) * 100,
      chart,
    };
  });
}

// ---------- the ladder plan (Dave's plan B, adopted 2026-10-11) ----------
// 10% of the balance always in C; 25% follows C vs its 50-day average (±2% band);
// 65% follows C vs its 200-day average (±3% band). Target C: 100 / 75 / 35 / 10%.
// Changed from 15% / 60% on 2026-10-11 for more protection in a 2008-style crash.
export const LADDER = {
  floor: 0.1,
  fast: { n: 50, band: 0.02, weight: 0.25 },
  slow: { n: RULE.n, band: RULE.band, weight: 0.65 },
  adopted: "2026-10-11",
};

function ladderTargets(rows) {
  const c = rows.map((r) => r.C);
  const fast = trendSeries(c, LADDER.fast.n, LADDER.fast.band);
  const slow = trendSeries(c, LADDER.slow.n, LADDER.slow.band);
  const target = c.map((_, i) => LADDER.floor + LADDER.fast.weight * (fast.on[i] ? 1 : 0) + LADDER.slow.weight * (slow.on[i] ? 1 : 0));
  return { fast, slow, target };
}

// Same execution model as backtest(): act at the close after a change, two unrestricted
// transfers a month, further moves allowed only when they lower C (into G).
// Returns the full replay (curve, years, steps) in the same shape as backtest(); fractions, not percents.
function replayTargets(rows, target, startDate) {
  const N = rows.length;
  const s0 = rows.findIndex((r) => r.d >= startDate);
  if (s0 < 0 || s0 >= N - 1) return null;
  let cur = target[s0], v = 10000, peak = v, mdd = 0, month = "", mCount = 0, moves = 0, sumC = 0;
  const hold = { C: 10000, G: 10000 }, holdPeak = { C: 10000 }, holdMdd = { C: 0 };
  const curve = [{ d: rows[s0].d, rule: 10000, C: 10000, G: 10000 }], steps = [], yearEnd = {}, vals = [v];
  for (let i = s0 + 1; i < N; i++) {
    const rc = rows[i].C / rows[i - 1].C, rg = rows[i].G / rows[i - 1].G;
    v *= cur * rc + (1 - cur) * rg; hold.C *= rc; hold.G *= rg;
    const m = rows[i].d.slice(0, 7);
    if (m !== month) { month = m; mCount = 0; }
    const want = target[i - 1];
    if (Math.abs(want - cur) > 1e-9 && (mCount < RULE.iftsPerMonth || want < cur)) {
      steps.push({ date: rows[i].d, fromC: Math.round(cur * 100), toC: Math.round(want * 100) });
      cur = want; mCount++; moves++;
    }
    sumC += cur; peak = Math.max(peak, v); mdd = Math.min(mdd, v / peak - 1); vals.push(v);
    holdPeak.C = Math.max(holdPeak.C, hold.C); holdMdd.C = Math.min(holdMdd.C, hold.C / holdPeak.C - 1);
    if (i % 5 === 0 || i === N - 1) curve.push({ d: rows[i].d, rule: v, C: hold.C, G: hold.G });
    yearEnd[rows[i].d.slice(0, 4)] = { rule: v, C: hold.C, G: hold.G };
  }
  let worst12 = 0;
  for (let i = 252; i < vals.length; i++) worst12 = Math.min(worst12, vals[i] / vals[i - 252] - 1);
  const years = (new Date(rows[N - 1].d) - new Date(rows[s0].d)) / (365.25 * 864e5);
  const cagr = (x) => Math.pow(x / 10000, 1 / years) - 1;
  const annual = [];
  let prev = { rule: 10000, C: 10000, G: 10000 };
  for (const y of Object.keys(yearEnd).sort()) {
    const e = yearEnd[y];
    annual.push({ year: y, rule: e.rule / prev.rule - 1, C: e.C / prev.C - 1, G: e.G / prev.G - 1 });
    prev = e;
  }
  return {
    start: rows[s0].d, end: rows[N - 1].d, years,
    rule: { final: v, cagr: cagr(v), maxDrawdown: mdd, worst12, switches: moves, movesPerYear: moves / years, avgC: sumC / (N - 1 - s0) },
    holdC: { final: hold.C, cagr: cagr(hold.C), maxDrawdown: holdMdd.C },
    holdG: { final: hold.G, cagr: cagr(hold.G) },
    annual: annual.reverse(),
    steps: steps.reverse(),
    curve,
  };
}

export function ladderBacktest(rows) {
  return replayTargets(rows, ladderTargets(rows).target, RULE.backtestStart);
}

export function currentLadder(rows) {
  const { fast, slow, target } = ladderTargets(rows);
  const L = rows.length - 1, price = rows[L].C;
  const leg = (t, cfg) => {
    const on = t.on[L], avg = t.sma[L];
    const level = on ? avg * (1 - cfg.band) : avg * (1 + cfg.band);
    let k = L;
    while (k > 0 && t.on[k - 1] === on) k--;
    return { on, average: avg, level, pctToLevel: (level / price - 1) * 100, since: rows[k].d, weightPct: cfg.weight * 100, n: cfg.n, bandPct: cfg.band * 100 };
  };
  const changes = [];
  for (let i = Math.max(1, L - 756); i <= L; i++) {
    if (Math.abs(target[i] - target[i - 1]) > 1e-9) changes.push({ date: rows[i].d, fromC: Math.round(target[i - 1] * 100), toC: Math.round(target[i] * 100) });
  }
  const r = replayTargets(rows, target, RULE.backtestStart);
  const bt = r && {
    final: r.rule.final, cagr: r.rule.cagr * 100, maxDrawdown: r.rule.maxDrawdown * 100, worst12: r.rule.worst12 * 100,
    movesPerYear: r.rule.movesPerYear, annual: r.annual.slice(0, 5).map((a) => ({ year: a.year, ret: a.rule * 100 })),
  };
  return {
    asOf: rows[L].d,
    price,
    targetC: Math.round(target[L] * 100),
    targetG: 100 - Math.round(target[L] * 100),
    targetSince: changes.length ? changes[changes.length - 1].date : null,
    floorPct: LADDER.floor * 100,
    fast: leg(fast, LADDER.fast),
    slow: leg(slow, LADDER.slow),
    recentChanges: changes.slice(-8).reverse(),
    backtest: bt,
    adopted: LADDER.adopted,
  };
}

// ---------- volatility gauge (context: the plan does not trade on it) ----------
// How much a fund's price has been swinging: the 20-day standard deviation of daily
// moves, annualized, as a percent. For C, each zone shows what followed it in C's own
// history since 2004: how often a 10%+ drop came within 3 months, and how often C was
// higher 3 months later.
export const VOL_ZONES = [
  { id: "calm", label: "CALM", lo: 0, hi: 13 },
  { id: "normal", label: "NORMAL", lo: 13, hi: 17 },
  { id: "elevated", label: "ELEVATED", lo: 17, hi: 25 },
  { id: "stressed", label: "STRESSED", lo: 25, hi: 35 },
  { id: "panic", label: "PANIC", lo: 35, hi: Infinity },
];
export const VOL_LEVELS = { calm: 17, fastCrash: 25, horizonDays: 63, dropPct: 10 };

function volSeries(c, n = 20) {
  const out = new Array(c.length).fill(null);
  for (let i = n; i < c.length; i++) {
    let s = 0, s2 = 0;
    for (let k = i - n + 1; k <= i; k++) { const x = Math.log(c[k] / c[k - 1]); s += x; s2 += x * x; }
    const m = s / n;
    out[i] = Math.sqrt(Math.max(0, (s2 - n * m * m) / (n - 1))) * Math.sqrt(252) * 100;
  }
  return out;
}

export function volatilityGauge(rows) {
  const L = rows.length - 1;
  const s0 = Math.max(rows.findIndex((r) => r.d >= RULE.backtestStart), 21);
  const H = VOL_LEVELS.horizonDays;
  const c = rows.map((r) => r.C), g = rows.map((r) => r.G);
  const vol = { C: volSeries(c), S: volSeries(rows.map((r) => r.S)), I: volSeries(rows.map((r) => r.I)) };
  const vc = vol.C;
  const zoneOf = (v) => VOL_ZONES.find((z) => v >= z.lo && v < z.hi);

  // what followed each zone
  const tally = Object.fromEntries(VOL_ZONES.map((z) => [z.id, { days: 0, drops: 0, ups: 0 }]));
  let all = 0, allDrops = 0;
  for (let i = s0; i <= L - H; i++) {
    const t = tally[zoneOf(vc[i]).id];
    let low = Infinity;
    for (let j = i + 1; j <= i + H; j++) low = Math.min(low, c[j]);
    const drop = low / c[i] - 1 <= -VOL_LEVELS.dropPct / 100;
    t.days++; t.drops += drop; t.ups += c[i + H] > c[i]; all++; allDrops += drop;
  }
  const zones = VOL_ZONES.map((z) => {
    const t = tally[z.id];
    return { id: z.id, label: z.label, lo: z.lo, hi: Number.isFinite(z.hi) ? z.hi : null, sharePct: (t.days / all) * 100,
      dropOddsPct: t.days ? (t.drops / t.days) * 100 : null, upPct: t.days ? (t.ups / t.days) * 100 : null };
  });

  // every 50-day step to G: did sitting in G until the buy-back beat staying in C?
  const fast = trendSeries(c, LADDER.fast.n, LADDER.fast.band).on;
  const exits = { calm: { n: 0, helped: 0 }, busy: { n: 0, helped: 0 } };
  for (let i = s0; i < L; i++) {
    if (!(fast[i - 1] && fast[i] === false)) continue;
    let j = i + 1;
    while (j < L && !fast[j]) j++;
    if (j >= L) continue;
    const a = i + 1, b = j + 1;
    const k = vc[i] < VOL_LEVELS.calm ? exits.calm : exits.busy;
    k.n++; k.helped += (c[a] / c[b]) * (g[b] / g[a]) > 1;
  }

  // C, S and I side by side
  const years = (new Date(rows[L].d) - new Date(rows[s0].d)) / 3.15576e10;
  const gCagr = (g[L] / g[s0]) ** (1 / years) - 1;
  const funds = ["C", "S", "I"].map((id) => {
    const x = rows.map((r) => r[id]);
    const hist = vol[id].slice(s0).filter((v) => v != null).sort((a, b) => a - b);
    const now = vol[id][L];
    const lr = [];
    for (let i = s0 + 1; i <= L; i++) lr.push(Math.log(x[i] / x[i - 1]));
    const m = lr.reduce((a, b) => a + b, 0) / lr.length;
    const longVol = Math.sqrt(lr.reduce((a, b) => a + (b - m) ** 2, 0) / (lr.length - 1)) * Math.sqrt(252);
    const cagr = (x[L] / x[s0]) ** (1 / years) - 1;
    return { id, now, median: hist[Math.floor(hist.length / 2)], percentile: (hist.filter((v) => v <= now).length / hist.length) * 100,
      cagrPct: cagr * 100, longVolPct: longVol * 100, returnPerRisk: (cagr - gCagr) / longVol };
  });

  const sma50 = smaSeries(c, LADDER.fast.n);
  const slowOn = trendSeries(c, LADDER.slow.n, LADDER.slow.band).on[L];
  const current = zoneOf(vc[L]);
  return {
    asOf: rows[L].d,
    vol: vc[L],
    zone: current.id,
    zoneLabel: current.label,
    since: rows[s0].d,
    horizonDays: H,
    dropPct: VOL_LEVELS.dropPct,
    overallDropOddsPct: (allDrops / all) * 100,
    zones,
    calmLevel: VOL_LEVELS.calm,
    fastExits: exits,
    fastCrash: { level: VOL_LEVELS.fastCrash, on: vc[L] >= VOL_LEVELS.fastCrash && c[L] < sma50[L] && slowOn === true,
      volAbove: vc[L] >= VOL_LEVELS.fastCrash, belowAverage50: c[L] < sma50[L], slowLegInC: slowOn === true },
    funds,
  };
}

export function buildSignal(rows) {
  const rule = currentRule(rows);
  const watch = weeklyWatch(rows);
  const bt = backtest(rows, 1);
  const byShare = {};
  for (const pct of [100, 75, 50, 25]) {
    const b = pct === 100 ? bt : backtest(rows, pct / 100);
    if (b) byShare[pct] = { ...b.rule, thisYear: b.annual[0] && b.annual[0].rule };
  }
  return {
    source: "tsp.gov official share prices",
    asOf: rows[rows.length - 1].d,
    generatedAt: new Date().toISOString(),
    rule,
    ladder: currentLadder(rows),
    volatility: volatilityGauge(rows),
    watch,
    funds: fundSnapshots(rows),
    backtest: ladderBacktest(rows),
    backtestByShare: byShare,
  };
}
