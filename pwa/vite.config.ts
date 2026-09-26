import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { pwaOptions } from "./src/sw/pwaOptions.ts";

// PORT is the API server's port (server/config.ts); API_PORT overrides the proxy target
// alone, so parallel checkouts can each run an isolated API + web server pair.
const apiPort = Number(process.env.API_PORT ?? process.env.PORT ?? 8787);
const webPort = Number(process.env.WEB_PORT ?? 5173);

export default defineConfig({
  publicDir: "public",
  plugins: [
    react(),
    VitePWA(pwaOptions),
  ],
  server: {
    port: webPort,
    strictPort: true,
    proxy: { "/api": `http://localhost:${apiPort}` },
  },
  preview: {
    port: webPort,
    strictPort: true,
    proxy: { "/api": `http://localhost:${apiPort}` },
  },
});
