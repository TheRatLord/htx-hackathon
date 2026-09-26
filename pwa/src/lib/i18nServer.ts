// Localising the English strings the server sends (spec G.4 "i18n of server strings").

import type { WalkStep } from "../api/types.ts";
import { ApiError } from "../api/client.ts";
import { hasKey, t, type Lang, type Vars } from "../i18n/index.ts";

const SIDE = /^(North|South|East|West) side of (.+)$/;

/** Splits a server `side` ("North side of Lamar St") into its direction and street. */
export function sideDirection(side: string): { dir: "north" | "south" | "east" | "west"; street: string } | undefined {
  const m = side.match(SIDE);
  return m ? { dir: m[1].toLowerCase() as "north", street: m[2] } : undefined;
}

export function localiseSide(side: string, lang: Lang): string {
  const parsed = sideDirection(side);
  return parsed ? t(`side.${parsed.dir}`, { street: parsed.street }, lang) : side;
}

/** Turn-like maneuvers ("turn", "end of road", "fork", ...) are phrased by their modifier. */
function stepKey(step: WalkStep): string {
  const byManeuver = `walkStep.${step.maneuver}`;
  if (["depart", "arrive", "roundabout"].includes(step.maneuver)) return byManeuver;
  if (step.maneuver === "continue" || step.maneuver === "new name" || !step.modifier || step.modifier === "straight")
    return "walkStep.continue";
  return `walkStep.${step.modifier}`;
}

export function walkStepText(step: WalkStep, lang: Lang): string {
  const key = stepKey(step);
  const variant = step.street ? "street" : "bare";
  if (!hasKey(`${key}.${variant}`, lang)) return step.instruction;
  return t(`${key}.${variant}`, step.street ? { street: step.street } : undefined, lang);
}

/** Localised error text by code; the server's English message is only the fallback. */
export function errorText(err: ApiError | Error, vars: Vars | undefined, lang: Lang): string {
  const key = `error.${err instanceof ApiError ? err.code : "unknown"}`;
  if (!hasKey(key, lang)) return lang === "en" ? err.message : t("error.unknown", undefined, lang);
  const text = t(key, vars, lang);
  // A placeholder with no value (e.g. no stop id in context) reads worse than the server's own message.
  if (/\{\w+\}/.test(text)) return lang === "en" ? err.message : t("error.unknown", undefined, lang);
  return text;
}
