// NotifyPermissionCard is shown at most once per context (C.15), remembered in
// localStorage["ridemetro.notifyAsked"].

import { persistentStore } from "../lib/storage.ts";

export type NotifyContext = "trip" | "stop-track";

const store = persistentStore<Partial<Record<NotifyContext, "granted" | "declined">>>("ridemetro.notifyAsked", {});

export const wasNotifyAsked = (context: NotifyContext) => store.get()[context] !== undefined;

export function markNotifyAsked(context: NotifyContext, result: "granted" | "declined") {
  store.set((s) => ({ ...s, [context]: result }));
}
