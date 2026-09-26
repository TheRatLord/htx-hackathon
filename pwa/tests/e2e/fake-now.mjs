// Node preload for the e2e API server: shifts Date so scheduled times are deterministic.
//   E2E_NOW=2026-09-24T12:00:00-05:00  -> the server clock starts at that instant and runs on.
//   E2E_NOW_FILE=<path>                -> if that file exists, its ISO time replaces E2E_NOW
//                                          (checked every 300 ms, so a test can jump to late night).
// Tests learn the server's "now" from /api/nearby's generatedAt and set the browser clock to match.
import { existsSync, readFileSync } from "node:fs";

const RealDate = Date;
const realNow = RealDate.now.bind(RealDate);
let offset = 0;
let source = "";

function apply(iso) {
  if (!iso || iso === source) return;
  const t = RealDate.parse(iso);
  if (Number.isNaN(t)) return;
  source = iso;
  offset = t - realNow();
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

class ShiftedDate extends RealDate {
  constructor(...args) {
    if (args.length === 0) super(realNow() + offset);
    else super(...args);
  }
  static now() {
    return realNow() + offset;
  }
}
globalThis.Date = ShiftedDate;
