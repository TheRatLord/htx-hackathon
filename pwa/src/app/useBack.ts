import { useLocation, useNavigate } from "react-router";
import { parentOf } from "./routes.ts";

/** True when this tab has an earlier in-app entry (react-router numbers its history entries). */
const hasHistory = () => ((window.history.state as { idx?: number } | null)?.idx ?? 0) > 0;

/** "‹ Back": history when the app has some in this session, else the logical parent (C.7). */
export function useBack(): () => void {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  // Replace, so a cold deep link's Back chain walks up the parents instead of looping.
  return () => (hasHistory() ? navigate(-1) : navigate(parentOf(pathname, search), { replace: true }));
}
