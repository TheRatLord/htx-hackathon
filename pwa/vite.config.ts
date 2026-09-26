import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// PORT is the API server's port (server/config.ts); API_PORT overrides the proxy target
// alone, so parallel checkouts can each run an isolated API + web server pair.
const apiPort = Number(process.env.API_PORT ?? process.env.PORT ?? 8787);
const webPort = Number(process.env.WEB_PORT ?? 5173);

export default defineConfig({
  publicDir: "public",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "RideMETRO",
        short_name: "RideMETRO",
        theme_color: "#2976C7",
        background_color: "#F9F9FF",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/brand/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
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
