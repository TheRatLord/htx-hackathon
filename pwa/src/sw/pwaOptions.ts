// vite-plugin-pwa options (D22): the manifest, and a Workbox service worker that precaches the
// app shell, fonts, icons, stops.json and routes.json, and keeps map tiles for a week so the map
// still draws offline. API answers are not cached here: TanStack Query persists them to
// IndexedDB (persister.ts), so every time the rider sees keeps its "Updated …" age.

import type { VitePWAOptions } from "vite-plugin-pwa";

const DAY = 24 * 60 * 60;

export const pwaOptions: Partial<VitePWAOptions> = {
  registerType: "autoUpdate",
  includeAssets: ["brand/icon.svg", "brand/apple-touch-icon.png"],
  manifest: {
    name: "RideMETRO",
    short_name: "RideMETRO",
    description: "Next buses near you, trip planning and service alerts for METRO Houston.",
    theme_color: "#2976C7",
    background_color: "#F9F9FF",
    display: "standalone",
    orientation: "portrait",
    start_url: "/",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  },
  workbox: {
    globPatterns: ["**/*.{js,css,html,woff,woff2,svg,png,webmanifest}", "data/stops.json", "data/routes.json"],
    // stops.json is about 1.6 MB.
    maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
    navigateFallback: "/index.html",
    navigateFallbackDenylist: [/^\/api\//, /^\/data\//],
    cleanupOutdatedCaches: true,
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/tiles\.openfreemap\.org\/planet\/.+\.pbf$/,
        handler: "CacheFirst",
        options: { cacheName: "map-tiles", expiration: { maxEntries: 2000, maxAgeSeconds: 7 * DAY }, cacheableResponse: { statuses: [0, 200] } },
      },
      {
        // The style, its TileJSON, sprites and label glyphs.
        urlPattern: /^https:\/\/tiles\.openfreemap\.org\//,
        handler: "StaleWhileRevalidate",
        options: { cacheName: "map-style", expiration: { maxEntries: 400, maxAgeSeconds: 30 * DAY }, cacheableResponse: { statuses: [0, 200] } },
      },
    ],
  },
};
