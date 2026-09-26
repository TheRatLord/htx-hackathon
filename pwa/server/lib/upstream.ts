// Fetching third-party APIs with timeouts, recorded fixtures and an OFFLINE mode.
//
// Every call names a `fixtureKey` that describes the request WITHOUT secrets
// (API keys never reach disk). With RECORD_FIXTURES=1 successful responses are
// saved under server/fixtures/<service>/; with OFFLINE=1 only those are served;
// otherwise a fixture is a fallback when the live call fails, for the slow-changing services only
// (trip plans, place search, walking routes). Realtime services never fall back: a months-old
// recording shown as today's METRO alerts or live arrivals is worse than "unavailable".

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PWA_ROOT, config } from "../config.ts";

export type UpstreamService = "transitous" | "photon" | "osrm" | "metro-odata" | "metro-alerts" | "metro-tripupdates";

/** Services whose answer is about right now: a recorded one is never passed off as current. */
const REALTIME = new Set<UpstreamService>(["metro-odata", "metro-alerts", "metro-tripupdates"]);

export class UpstreamError extends Error {
  constructor(
    public service: UpstreamService,
    message: string,
    public status?: number,
  ) {
    super(message);
  }
}

interface FixtureFile {
  key: string;
  recordedAt: string;
  json?: unknown;
  base64?: string;
}

export interface UpstreamResult<T> {
  body: T;
  /** Set when the response came from a recorded fixture. */
  recordedAt?: string;
}

const FIXTURE_DIR = join(PWA_ROOT, "server/fixtures");

function fixturePath(service: UpstreamService, key: string): string {
  const slug = key.replace(/[^a-z0-9]+/gi, "-").slice(0, 60).replace(/^-|-$/g, "");
  const hash = createHash("sha1").update(key).digest("hex").slice(0, 10);
  return join(FIXTURE_DIR, service, `${slug}-${hash}.json`);
}

function readFixture(service: UpstreamService, key: string): FixtureFile | null {
  const p = fixturePath(service, key);
  return existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")) as FixtureFile) : null;
}

function writeFixture(service: UpstreamService, key: string, body: unknown) {
  const p = fixturePath(service, key);
  mkdirSync(join(FIXTURE_DIR, service), { recursive: true });
  const file: FixtureFile = { key, recordedAt: new Date().toISOString() };
  if (body instanceof Uint8Array) file.base64 = Buffer.from(body).toString("base64");
  else file.json = body;
  writeFileSync(p, JSON.stringify(file, null, 1));
}

function fromFixture<T>(f: FixtureFile, binary: boolean): UpstreamResult<T> {
  const body = binary ? new Uint8Array(Buffer.from(f.base64 ?? "", "base64")) : f.json;
  return { body: body as T, recordedAt: f.recordedAt };
}

export async function fetchUpstream<T = unknown>(opts: {
  service: UpstreamService;
  url: string;
  fixtureKey: string;
  binary?: boolean;
  timeoutMs?: number;
  /** Extra request headers (METRO's subscription key goes here, not in the URL, so it stays out of logs). */
  headers?: Record<string, string>;
  /** Serve the recorded fixture when the live call fails. Default: off for realtime services. */
  allowFixtureFallback?: boolean;
}): Promise<UpstreamResult<T>> {
  const { service, url, fixtureKey, binary = false, timeoutMs = 8000, headers = {} } = opts;
  const fallback = opts.allowFixtureFallback ?? !REALTIME.has(service);
  if (config.offline) {
    const f = readFixture(service, fixtureKey);
    if (!f) throw new UpstreamError(service, `offline mode has no recorded ${service} response for this request`);
    return fromFixture<T>(f, binary);
  }
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": config.userAgent, Accept: binary ? "application/x-protobuf" : "application/json", ...headers },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) throw new UpstreamError(service, `${service} responded with HTTP ${res.status}`, res.status);
    const body = binary ? new Uint8Array(await res.arrayBuffer()) : await res.json();
    if (config.recordFixtures) writeFixture(service, fixtureKey, body);
    return { body: body as T };
  } catch (err) {
    const f = fallback ? readFixture(service, fixtureKey) : null;
    if (f) return fromFixture<T>(f, binary);
    if (err instanceof UpstreamError) throw err;
    const reason = err instanceof Error && err.name === "TimeoutError" ? "timed out" : "could not be reached";
    throw new UpstreamError(service, `${service} ${reason}`);
  }
}

/** METRO's API Management key, sent as a header rather than a `subscription-key` query parameter. */
export const metroKeyHeader = (key: string | undefined): Record<string, string> => (key ? { "Ocp-Apim-Subscription-Key": key } : {});
