// In-app notifications (spec C.17). Always through the service worker: on Android
// Chrome `new Notification()` throws "Illegal constructor".

export type NotifyPermission = "default" | "granted" | "denied" | "unsupported";

const supported = () => typeof Notification !== "undefined" && "serviceWorker" in navigator;

export function notifyPermission(): NotifyPermission {
  return supported() ? Notification.permission : "unsupported";
}

export async function requestNotify(): Promise<NotifyPermission> {
  if (!supported()) return "unsupported";
  return Notification.requestPermission();
}

const BUZZ = [200, 100, 200];
/** `serviceWorker.ready` never settles when no worker is registered (e.g. `vite dev`). */
const SW_READY_TIMEOUT_MS = 3_000;

/** Shows a notification through the service worker; without one, it still buzzes. */
export async function notify(title: string, body: string, tag: string): Promise<void> {
  if (notifyPermission() !== "granted") return;
  const timeout = new Promise<undefined>((resolve) => setTimeout(resolve, SW_READY_TIMEOUT_MS));
  const registration = await Promise.race([navigator.serviceWorker.ready, timeout]);
  if (registration) await registration.showNotification(title, { body, tag, vibrate: BUZZ } as NotificationOptions);
  else vibrate(BUZZ);
}

export function vibrate(pattern: number | number[]) {
  if ("vibrate" in navigator) navigator.vibrate(pattern);
}
