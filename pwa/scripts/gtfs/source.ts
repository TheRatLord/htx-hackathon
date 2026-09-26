import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { unzipSync } from "fflate";

export const GTFS_URL = "https://metro.resourcespace.com/pages/download.php?ref=4835&ext=zip";
const MAX_AGE_MS = 7 * 24 * 3600 * 1000;

/**
 * Returns a directory containing the extracted METRO GTFS feed.
 * GTFS_DIR overrides everything; otherwise the zip is cached in .cache/ for a week.
 */
export async function ensureGtfs(cacheDir: string): Promise<string> {
  if (process.env.GTFS_DIR) return process.env.GTFS_DIR;
  const zipPath = join(cacheDir, "metro-gtfs.zip");
  const outDir = join(cacheDir, "gtfs");
  mkdirSync(cacheDir, { recursive: true });
  const fresh = existsSync(zipPath) && Date.now() - statSync(zipPath).mtimeMs < MAX_AGE_MS;
  if (!fresh) {
    console.log(`Downloading ${GTFS_URL}`);
    const res = await fetch(GTFS_URL, { headers: { "User-Agent": "htx-metro-hackathon-demo" } });
    if (!res.ok) throw new Error(`GTFS download failed: HTTP ${res.status}`);
    writeFileSync(zipPath, Buffer.from(await res.arrayBuffer()));
  }
  if (!fresh || !existsSync(join(outDir, "stop_times.txt"))) {
    mkdirSync(outDir, { recursive: true });
    const files = unzipSync(readFileSync(zipPath));
    for (const [name, data] of Object.entries(files)) {
      if (name.endsWith(".txt")) writeFileSync(join(outDir, name.split("/").pop()!), data);
    }
  }
  return outDir;
}
