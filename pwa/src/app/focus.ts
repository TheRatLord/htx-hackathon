import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router";

/**
 * After every navigation (not replace-only query changes, not the first load) move focus to the
 * new screen's <h1 tabindex="-1">, so screen readers start at the title.
 */
export function useFocusOnNavigate(): void {
  const { key } = useLocation();
  const type = useNavigationType();
  const lastKey = useRef<string | null>(null);
  useEffect(() => {
    const first = lastKey.current === null;
    const same = lastKey.current === key;
    lastKey.current = key;
    if (first || same || type === "REPLACE") return;
    // Wait a frame so the new screen (and its sheet header) has rendered.
    const id = requestAnimationFrame(() => document.querySelector<HTMLElement>("main h1[tabindex='-1']")?.focus());
    return () => cancelAnimationFrame(id);
  }, [key, type]);
}
