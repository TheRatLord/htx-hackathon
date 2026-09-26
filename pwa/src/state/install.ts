// "Add to home screen" (D22): never shown automatically. The browser fires
// `beforeinstallprompt` once, early, so it is captured at startup (imported by main.tsx).

import { useSyncExternalStore } from "react";
import { createSignal } from "../lib/signal.ts";

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: InstallPromptEvent | null = null;
const signal = createSignal();
const changed = signal.notify;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferred = e as InstallPromptEvent;
  changed();
});
window.addEventListener("appinstalled", () => {
  deferred = null;
  changed();
});

const { subscribe } = signal;
const get = () => deferred !== null;

/** `available` once the browser offers installation; `prompt()` shows its dialog (usable once). */
export function useInstallPrompt(): { available: boolean; prompt: () => Promise<"accepted" | "dismissed" | "unavailable"> } {
  const available = useSyncExternalStore(subscribe, get, () => false);
  return {
    available,
    async prompt() {
      const event = deferred;
      if (!event) return "unavailable";
      deferred = null;
      changed();
      await event.prompt();
      return (await event.userChoice).outcome;
    },
  };
}
