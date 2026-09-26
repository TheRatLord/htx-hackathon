import { useSyncExternalStore } from "react";

function subscribe(listener: () => void) {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
}

const get = () => navigator.onLine;

/** False while the browser reports no connection (the offline rule: clock times, scheduled styling). */
export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, get, () => true);
}
