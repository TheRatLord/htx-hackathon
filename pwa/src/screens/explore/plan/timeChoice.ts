// The planner's time chips (spec D11): Now / In 15 min / In 30 min / In 1 hr / Other time.
// The URL only holds an absolute time, so the chip that produced it is remembered for the session.

import type { PlanQuery } from "../../../lib/planQuery.ts";
import { readJson, writeJson } from "../../../lib/storage.ts";

export type TimeChip = "now" | "in15" | "in30" | "in60" | "other";

export const RELATIVE_CHIPS: { chip: TimeChip; min: number }[] = [
  { chip: "in15", min: 15 },
  { chip: "in30", min: 30 },
  { chip: "in60", min: 60 },
];

const KEY = "ridemetro.planTimeChip";

export function chipFor(q: PlanQuery): TimeChip {
  if (!q.time) return "now";
  const stored = readJson<{ time: string; chip: TimeChip } | null>(KEY, null, "session");
  return stored?.time === q.time && !q.arriveBy ? stored.chip : "other";
}

/** The query for a relative chip ("In 15 min" = leave 15 minutes from `now`). */
export function relativeTime(q: PlanQuery, chip: TimeChip, min: number, now: number): PlanQuery {
  const time = new Date(now + min * 60_000).toISOString();
  writeJson(KEY, { time, chip }, "session");
  return { ...q, time, arriveBy: undefined };
}
