// Imported by the Workbox service worker (pwaOptions.ts, importScripts). Without a
// notificationclick handler, tapping "Get off at the next stop" on Android did nothing: the
// notification closed and the app stayed in the background. A tap now brings the app forward on
// the screen that sent it (the live trip or the tracked stop), or opens it there.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin);
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (windows) => {
      // A window already on that screen (query strings and hashes may differ): just bring it forward.
      const same = windows.find((w) => new URL(w.url).pathname === target.pathname);
      if (same) return same.focus();
      // Another window of the app: bring it forward and move it to the screen that sent the
      // notification. navigate() needs a window this worker controls; otherwise open a new one.
      const other = windows[0];
      if (other) {
        try {
          const moved = await other.navigate(target.href);
          if (moved) return moved.focus();
        } catch {
          /* not controlled by this worker */
        }
      }
      return self.clients.openWindow(target.href);
    }),
  );
});
