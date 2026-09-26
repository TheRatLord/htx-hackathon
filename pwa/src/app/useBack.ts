import { useLocation, useNavigate } from "react-router";
import { parentOf } from "./routes.ts";

/** "‹ Back": history when the app has some in this session, else the logical parent (C.7). */
export function useBack(): () => void {
  const navigate = useNavigate();
  const location = useLocation();
  return () => (location.key === "default" ? navigate(parentOf(location.pathname)) : navigate(-1));
}
