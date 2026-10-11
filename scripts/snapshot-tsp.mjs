// Runs before every build: saves the full official price history (and the file's version
// tags) into the deployment, so the app only downloads again when TSP posts new prices.
// Never fails the build: if tsp.gov can't be reached it writes an empty snapshot and the
// app downloads the history itself at runtime.
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { fetchTspFile, FUND_IDS } from "../lib/tspCsv.mjs";

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "data", "tsp-history.json");
mkdirSync(dirname(out), { recursive: true });

const snapshot = { source: "tsp.gov", fetchedAt: new Date().toISOString(), through: null, etag: null, lastModified: null, fields: ["d", ...FUND_IDS], rows: [] };
try {
  const r = await fetchTspFile({}, 60000);
  snapshot.rows = r.rows.map((row) => [row.d, ...FUND_IDS.map((f) => row[f])]);
  snapshot.through = r.rows[r.rows.length - 1].d;
  snapshot.etag = r.etag;
  snapshot.lastModified = r.lastModified;
  console.log(`TSP snapshot: ${r.rows.length} days, ${r.rows[0].d} to ${snapshot.through}`);
} catch (e) {
  console.warn(`TSP snapshot skipped (${e.message}); the app will download history at runtime.`);
}
writeFileSync(out, JSON.stringify(snapshot));
