import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router";

// Module-level, so the first load is skipped once per page load (not once per layout) and a
// StrictMode effect re-run sees the same key.
let lastKey: string | null = null;
let lastPath = "";

/**
 * After every navigation (not the first load, not replace-only query changes) move focus to
 * the new screen's <h1 tabindex="-1">, so screen readers start at the title. Called once, by AppShell.
 */
export function useFocusOnNavigate(): void {
  const { key, pathname } = useLocation();
  const type = useNavigationType();
  useEffect(() => {
    const first = lastKey === null;
    const same = key === lastKey;
    const queryOnly = type === "REPLACE" && pathname === lastPath;
    lastKey = key;
    lastPath = pathname;
    if (first || same || queryOnly) return;
    // Wait a frame so the new screen (and its sheet header) has rendered. Not cancelled on
    // cleanup: a StrictMode re-run sees the same key and would skip it.
    requestAnimationFrame(() => document.querySelector<HTMLElement>("main h1[tabindex='-1']")?.focus());
  }, [key, pathname, type]);
}
