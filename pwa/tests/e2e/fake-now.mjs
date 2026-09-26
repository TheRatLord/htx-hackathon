// Node preload for the e2e API server: shifts or freezes Date so scheduled times are deterministic.
//   E2E_NOW=2026-09-24T12:00:00-05:00  -> the server clock is set to that instant.
//   E2E_FREEZE=1                       -> Date.now() and new Date() stay at that instant (a frozen
//                                          clock: every request in a screenshot set sees the same
//                                          "now"). Without it the clock starts there and runs on.
//   E2E_NOW_FILE=<path>                -> if that file exists, its ISO time replaces E2E_NOW
//                                          (checked every 300 ms, so a test can jump to late night).
//                                          "<iso> <tag>" re-applies the same time whenever the tag
//                                          changes: the screenshot run resets the clock per shot.
// Tests learn the server's "now" from /api/nearby's generatedAt and set the browser clock to match.
// Safe to freeze: loopback callers are never rate limited, and upstream back-offs are off OFFLINE.
import { existsSync, readFileSync } from "node:fs";

const RealDate = Date;
const realNow = RealDate.now.bind(RealDate);
const freeze = /^(1|true|yes)$/i.test(process.env.E2E_FREEZE ?? "");
let offset = 0;
let frozenAt = NaN;
let source = "";

function apply(iso) {
  if (!iso || iso === source) return;
  const t = RealDate.parse(iso.split(/\s+/)[0]);
  if (Number.isNaN(t)) return;
  source = iso;
  offset = t - realNow();
  frozenAt = t;
}

apply(process.env.E2E_NOW);
const file = process.env.E2E_NOW_FILE;
if (file) {
  const check = () => {
    try {
      apply(existsSync(file) ? readFileSync(file, "utf8").trim() : process.env.E2E_NOW);
    } catch {}
  };
  check();
  setInterval(check, 300).unref();
}

const now = () => (freeze && !Number.isNaN(frozenAt) ? frozenAt : realNow() + offset);

class ShiftedDate extends RealDate {
  constructor(...args) {
    if (args.length === 0) super(now());
    else super(...args);
  }
  static now() {
    return now();
  }
}
globalThis.Date = ShiftedDate;
