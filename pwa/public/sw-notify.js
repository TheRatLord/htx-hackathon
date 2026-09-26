// Imported by the Workbox service worker (pwaOptions.ts, importScripts). Without a
// notificationclick handler, tapping "Get off at the next stop" on Android did nothing: the
// notification closed and the app stayed in the background. A tap now brings the app forward on
// the screen that sent it (the live trip or the tracked stop), or opens it there.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const same = windows.find((w) => w.url === url) || windows[0];
      if (same) return same.focus();
      return self.clients.openWindow(url);
    }),
  );
});
