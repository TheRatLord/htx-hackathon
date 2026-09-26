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
  build: {
    rollupOptions: {
      output: {
        // Vendors in their own long-lived chunks: an app deploy doesn't re-download MapLibre.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("maplibre-gl")) return "maplibre";
          if (/[\\/](react|react-dom|react-router|scheduler|@tanstack)[\\/]/.test(id)) return "vendor";
          return undefined;
        },
      },
    },
  },
  server: {
    port: webPort,
    strictPort: true,
    proxy: { "/api": `http://localhost:${apiPort}` },
  },
  preview: {
    port: webPort,
    strictPort: true,
    allowedHosts: [".trycloudflare.com"],
    proxy: { "/api": `http://localhost:${apiPort}` },
  },
});
