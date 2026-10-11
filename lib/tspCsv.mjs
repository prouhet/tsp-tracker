// Shared by the app and the deploy-time snapshot script.
// tsp.gov publishes one static CSV with the full history (served from a CDN, regenerated
// once a day). It ignores date parameters but answers conditional requests, so we keep a
// stored copy and only download again when the file has changed.
export const SOURCE_URL = "https://www.tsp.gov/data/fund-price-history.csv";
export const FUND_IDS = ["G", "F", "C", "S", "I"];
const FUND_COLUMNS = { G: "G Fund", F: "F Fund", C: "C Fund", S: "S Fund", I: "I Fund" };

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
    for (const id of FUND_IDS) {
      const v = parseFloat(p[col[id]]);
      if (!(v > 0)) { ok = false; break; }
      row[id] = v;
    }
    if (ok) rows.push(row);
  }
  rows.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
  return rows.filter((r, i) => i === 0 || r.d !== rows[i - 1].d);
}

// Returns { notModified: true } when the stored copy is still current, otherwise
// { rows, etag, lastModified } from a fresh download.
export async function fetchTspFile({ etag, lastModified } = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const headers = { Accept: "text/csv,text/plain,*/*", "User-Agent": "Mozilla/5.0 (compatible; tsp-fund-signal-tracker/2.0)" };
  if (etag) headers["If-None-Match"] = etag;
  if (lastModified) headers["If-Modified-Since"] = lastModified;
  try {
    const res = await fetch(SOURCE_URL, { signal: controller.signal, headers, cache: "no-store" });
    if (res.status === 304) return { notModified: true };
    if (!res.ok) throw new Error(`tsp.gov returned HTTP ${res.status}`);
    const rows = parseTspCsv(await res.text());
    if (rows.length < 300) throw new Error(`tsp.gov returned only ${rows.length} days`);
    return { rows, etag: res.headers.get("etag"), lastModified: res.headers.get("last-modified") };
  } catch (e) {
    throw new Error(e.name === "AbortError" ? "tsp.gov timed out" : e.message);
  } finally {
    clearTimeout(timer);
  }
}
