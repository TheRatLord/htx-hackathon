import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";

export const PWA_ROOT = resolve(import.meta.dirname, "..");

// pwa/.env wins over the repo-level .env; neither overrides real env vars.
loadEnv({ path: [resolve(PWA_ROOT, ".env"), resolve(PWA_ROOT, "../.env")], quiet: true });

const flag = (name: string) => ["1", "true", "yes"].includes((process.env[name] ?? "").toLowerCase());

export const config = {
  port: Number(process.env.PORT ?? 8787),
  /** GTFS-RT TripUpdates + service alerts (protobuf). */
  metroApiKey: process.env.METRO_API_KEY || undefined,
  /** OData "Transit Data API": per-stop arrivals, vehicles, bays. */
  metroTransitApiKey: process.env.METRO_TRANSIT_API_KEY || undefined,
  /** Serve only recorded fixtures; never touch the network. */
  offline: flag("OFFLINE"),
  /** Save successful upstream responses as fixtures. */
  recordFixtures: flag("RECORD_FIXTURES"),
  /** Perturb scheduled times to look live when no real-time source is available. */
  demoRealtime: flag("DEMO_REALTIME"),
  /**
   * The API runs behind a reverse proxy that appends the client's address to X-Forwarded-For.
   * Off, the header is ignored (a client could set it to dodge the rate limit).
   */
  trustProxy: flag("TRUST_PROXY"),
  /** Browser origins allowed to call the API besides localhost, e.g. "https://ridemetro.example.org". */
  corsOrigins: (process.env.CORS_ORIGINS ?? "").split(",").map((o) => o.trim()).filter(Boolean),
  userAgent: "htx-metro-hackathon-demo (hackathon prototype; contact via github)",
  timezone: "America/Chicago",
};
