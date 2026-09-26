import type { LatLon } from "../shared/types.ts";
import { findStop } from "./gtfs/store.ts";
import type { PlanStop } from "./services/plan.ts";
import { ApiError } from "./services/errors.ts";
import { findLandmark } from "./services/landmarks.ts";

export function parseLatLon(value: string | undefined, name: string): LatLon {
  const m = value?.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  const lat = m ? Number(m[1]) : NaN;
  const lon = m ? Number(m[2]) : NaN;
  if (!m || Math.abs(lat) > 90 || Math.abs(lon) > 180) throw new ApiError(400, "BAD_COORDINATES", `"${name}" must look like 29.7604,-95.3698`);
  return { lat, lon };
}

export function optionalNumber(value: string | undefined, name: string): number | undefined {
  if (value === undefined || value === "") return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) throw new ApiError(400, "BAD_NUMBER", `"${name}" must be a number`);
  return n;
}

export function requireParam(value: string | undefined, name: string): string {
  if (!value?.trim()) throw new ApiError(400, "MISSING_PARAMETER", `Missing "${name}"`);
  return value.trim();
}

/** Trip endpoints accept "lat,lon", a stop id ("11424") or a landmark ("landmark:hobby-airport"). */
export function parsePlace(value: string | undefined, name: string): PlanStop {
  const v = requireParam(value, name);
  if (/^\d+$/.test(v)) {
    const s = findStop(v);
    if (!s) throw new ApiError(404, "STOP_NOT_FOUND", `We couldn't find stop #${v}.`);
    return { id: s.id, name: s.name, lat: s.lat, lon: s.lon, ...(s.dir && { directionLabel: s.dir }), ...(s.side && { side: s.side }) };
  }
  if (v.startsWith("landmark:")) {
    const l = findLandmark(v.slice("landmark:".length));
    if (!l) throw new ApiError(404, "LANDMARK_NOT_FOUND", `Unknown place "${v}".`);
    return { name: l.name, lat: l.lat, lon: l.lon };
  }
  const p = parseLatLon(v, name);
  return { name: name === "from" ? "Your starting point" : "Your destination", ...p };
}
