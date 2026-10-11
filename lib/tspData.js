// Official TSP share prices from tsp.gov.
// Each deployment carries a stored copy of the full history (scripts/snapshot-tsp.mjs).
// At runtime we ask tsp.gov whether its file has changed since that copy: "not modified"
// costs nothing, and a new file (once per trading day) is downloaded and replaces it.
// No API key, no ETF stand-ins, no demo data: with nothing official available we report
// an error instead of guessing.
import snapshot from "../data/tsp-history.json";
import { fetchTspFile, parseTspCsv, FUND_IDS } from "./tspCsv.mjs";

const RECHECK_MS = 30 * 60 * 1000; // ask tsp.gov at most every 30 minutes per server instance
const RETRY_AFTER_FAILURE_MS = 5 * 60 * 1000;

let current = null; // { rows, etag, lastModified, checkedAt, ttl, meta }

function fromSnapshot() {
  const rows = (snapshot.rows || []).map((a) => Object.fromEntries([["d", a[0]], ...FUND_IDS.map((f, i) => [f, a[i + 1]])]));
  return { rows, etag: snapshot.etag, lastModified: snapshot.lastModified };
}

export function getDataStatus() {
  return current ? current.meta : null;
}

export async function getTspHistory() {
  if (current && Date.now() - current.checkedAt < current.ttl) return current.rows;

  // Local development only: point TSP_CSV_FILE at a downloaded tsp.gov CSV to work offline.
  if (process.env.TSP_CSV_FILE) {
    const { readFile } = await import("fs/promises");
    const rows = parseTspCsv(await readFile(process.env.TSP_CSV_FILE, "utf8"));
    current = { rows, checkedAt: Date.now(), ttl: RECHECK_MS, meta: { mode: "local file", through: rows[rows.length - 1].d } };
    return rows;
  }

  const base = current || fromSnapshot();
  const have = base.rows.length > 0;
  const now = new Date().toISOString();
  try {
    const r = await fetchTspFile(have ? { etag: base.etag, lastModified: base.lastModified } : {});
    if (r.notModified) {
      current = { ...base, checkedAt: Date.now(), ttl: RECHECK_MS, meta: { mode: "stored copy is current", storedThrough: snapshot.through, through: base.rows[base.rows.length - 1].d, checkedAt: now, downloaded: false } };
    } else {
      current = { rows: r.rows, etag: r.etag, lastModified: r.lastModified, checkedAt: Date.now(), ttl: RECHECK_MS, meta: { mode: "new prices downloaded", storedThrough: snapshot.through, through: r.rows[r.rows.length - 1].d, checkedAt: now, downloaded: true } };
    }
    return current.rows;
  } catch (e) {
    if (have) {
      current = { ...base, checkedAt: Date.now(), ttl: RETRY_AFTER_FAILURE_MS, meta: { mode: "stored copy (tsp.gov unreachable)", storedThrough: snapshot.through, through: base.rows[base.rows.length - 1].d, checkedAt: now, error: e.message } };
      return current.rows;
    }
    throw new Error(`Could not load official prices from tsp.gov (${e.message})`);
  }
}
