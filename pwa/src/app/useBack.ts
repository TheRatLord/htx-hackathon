import { useLocation, useNavigate } from "react-router";
import { parentOf } from "./routes.ts";
import { openedByTab } from "./tabEntries.ts";

/** This entry's index in the tab's history (react-router numbers its history entries). */
const historyIdx = () => (window.history.state as { idx?: number } | null)?.idx ?? 0;

/**
 * "‹ Back": history when the app has some in this session, else the logical parent (C.7). An entry
 * the BottomNav opened also goes to its parent: history there leads into another tab.
 */
export function useBack(): () => void {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  // Replace, so a cold deep link's Back chain walks up the parents instead of looping.
  return () => {
    const idx = historyIdx();
    if (idx > 0 && !openedByTab(idx)) navigate(-1);
    else navigate(parentOf(pathname, search), { replace: true });
  };
}
