import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App.tsx";
import { loadRoutes } from "./lib/routes.ts";
import "./state/install.ts";
import "./state/prefs.ts";
import "./styles/tokens.css";
import "./styles/base.css";

void loadRoutes();

// The window's height as a CSS length (--win-h), for sizes that must match window.innerHeight in
// JS (the half sheet's 52%). 100dvh can't be used: an installed PWA on Android Chrome 113 resolves
// it 56px taller than the window after a reload (base.css).
const setWinH = () => document.documentElement.style.setProperty("--win-h", `${window.innerHeight}px`);
setWinH();
window.addEventListener("resize", setWinH);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
