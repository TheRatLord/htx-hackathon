import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App.tsx";
import { loadRoutes } from "./lib/routes.ts";
import "./state/prefs.ts";
import "./styles/tokens.css";
import "./styles/base.css";

void loadRoutes();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
