import { useEffect, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { setPrefs, usePrefs } from "../state/prefs.ts";
import { WELCOME_EXEMPT } from "./routes.ts";

/** First launch goes to Welcome, except shared deep links, which render directly (D1). */
export function WelcomeGuard({ children }: { children: ReactNode }) {
  const { welcomed } = usePrefs();
  const { pathname } = useLocation();
  const exempt = WELCOME_EXEMPT.some((re) => re.test(pathname)) || pathname.startsWith("/dev/");
  useEffect(() => {
    if (!welcomed && exempt) setPrefs({ welcomed: true });
  }, [welcomed, exempt]);
  if (!welcomed && !exempt && pathname !== "/welcome") return <Navigate to="/welcome" replace />;
  return children;
}
