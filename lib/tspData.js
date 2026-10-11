// Official TSP share prices, straight from tsp.gov.
// No API key, no ETF stand-ins, no demo data: if tsp.gov can't be reached we
// report an error rather than show made-up numbers.

const SOURCE_URL = "https://www.tsp.gov/data/fund-price-history.csv";
const FUND_COLUMNS = { G: "G Fund", F: "F Fund", C: "C Fund", S: "S Fund", I: "I Fund" };
const CACHE_TTL_MS = 30 * 60 * 1000; // prices change once per trading day

let cache = null; // { rows, fetchedAt }

export function parseTspCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0].split(",").map((h) => h.trim());
  const col = {};
  for (const [id, name] of Object.entries(FUND_COLUMNS)) {
    col[id] = header.indexOf(name);
    if (col[id] < 0) throw new Error(`tsp.gov file is missing the "${name}" column`);
  }
  const dateCol = header.indexOf("Date");
  const rows = [];
  for (const line of lines.slice(1)) {
    const p = line.split(",");
    const d = (p[dateCol] || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
    const row = { d };
    let ok = true;
    for (const id of Object.keys(FUND_COLUMNS)) {
      const v = parseFloat(p[col[id]]);
      if (!(v > 0)) { ok = false; break; }
      row[id] = v;
    }
    if (ok) rows.push(row);
  }
  rows.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
  // drop duplicate dates if any
  return rows.filter((r, i) => i === 0 || r.d !== rows[i - 1].d);
}

export async function getTspHistory() {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache.rows;
  // Local development only: point TSP_CSV_FILE at a downloaded tsp.gov CSV to work offline.
  if (process.env.TSP_CSV_FILE) {
    const { readFile } = await import("fs/promises");
    return parseTspCsv(await readFile(process.env.TSP_CSV_FILE, "utf8"));
  }
  const today = new Date().toISOString().slice(0, 10);
  const url = `${SOURCE_URL}?startdate=2003-01-01&enddate=${today}&Lfunds=0&InvFunds=1&download=0`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "text/csv,text/plain,*/*",
        "User-Agent": "Mozilla/5.0 (compatible; tsp-fund-signal-tracker/2.0)",
      },
    });
    if (!res.ok) throw new Error(`tsp.gov returned HTTP ${res.status}`);
    const rows = parseTspCsv(await res.text());
    if (rows.length < 300) throw new Error("tsp.gov returned too little price history");
    cache = { rows, fetchedAt: Date.now() };
    return rows;
  } catch (e) {
    if (cache) return cache.rows; // serve the last good copy rather than nothing
    throw new Error(`Could not load official prices from tsp.gov (${e.name === "AbortError" ? "timed out" : e.message})`);
  } finally {
    clearTimeout(timer);
  }
}
