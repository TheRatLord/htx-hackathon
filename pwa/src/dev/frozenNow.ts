// Dev-only frozen "now", for reproducible screenshots and manual checks (never in a production build).
//
//   http://localhost:5173/explore?now=2026-09-25T12:00:00-05:00   freeze the app clock at that instant
//   ...?now=off                                                     back to the real clock
//   window.__NOW__ = "2026-09-25T12:00:00-05:00"                    same, set before the app loads
//                                                                   (e.g. from a Playwright init script)
//
// The instant is kept in sessionStorage, so it survives in-app navigation and reloads in this tab.
// While frozen, Date.now() and new Date() return that instant everywhere in the page (every
// relative time, "can I make it" check and clock time agrees); timers and animations run as normal.
// The API has its own clock: start it with tests/e2e/fake-now.mjs (E2E_NOW=<same ISO>, E2E_FREEZE=1)
// so its departures are computed for the same instant.

declare global {
  interface Window {
    __NOW__?: string | number;
  }
}

const KEY = "ridemetro.dev.now";

function readOverride(): number | undefined {
  try {
    const param = new URLSearchParams(location.search).get("now");
    if (param === "off" || param === "") {
      sessionStorage.removeItem(KEY);
      return undefined;
    }
    const raw = param ?? (window.__NOW__ != null ? String(window.__NOW__) : sessionStorage.getItem(KEY));
    if (!raw) return undefined;
    const t = /^\d+$/.test(raw) ? Number(raw) : Date.parse(raw);
    if (Number.isNaN(t)) return undefined;
    sessionStorage.setItem(KEY, String(t));
    return t;
  } catch {
    return undefined;
  }
}

/** The frozen instant (ms), or undefined when the real clock is in use. Always undefined in production. */
export const frozenNow: number | undefined = import.meta.env.DEV && typeof window !== "undefined" ? readOverride() : undefined;

if (frozenNow !== undefined) {
  const RealDate = Date;
  const at = frozenNow;
  class FrozenDate extends RealDate {
    constructor(...args: ConstructorParameters<DateConstructor> | []) {
      if (args.length === 0) super(at);
      else super(...(args as ConstructorParameters<DateConstructor>));
    }
    static now() {
      return at;
    }
  }
  globalThis.Date = FrozenDate as DateConstructor;
  console.info(`[dev] clock frozen at ${new RealDate(at).toString()} (?now=off to release)`);
}
