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

export async function notify(title: string, body: string, tag: string): Promise<void> {
  if (notifyPermission() !== "granted") return;
  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification(title, { body, tag, vibrate: [200, 100, 200] } as NotificationOptions);
}

export function vibrate(pattern: number | number[]) {
  if ("vibrate" in navigator) navigator.vibrate(pattern);
}
