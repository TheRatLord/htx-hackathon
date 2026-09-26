import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PWA_ROOT } from "../config.ts";

export interface Landmark {
  id: string;
  name: string;
  category: string;
  aliases: string[];
  lat: number;
  lon: number;
  address?: string;
  /** Curated stops riders should use; otherwise the nearest stops are computed. */
  stopIds?: string[];
}

let cached: Landmark[] | null = null;

export function landmarks(): Landmark[] {
  cached ??= (JSON.parse(readFileSync(join(PWA_ROOT, "server/data/landmarks.json"), "utf8")) as { landmarks: Landmark[] }).landmarks;
  return cached;
}

export function findLandmark(id: string): Landmark | undefined {
  return landmarks().find((l) => l.id === id);
}
