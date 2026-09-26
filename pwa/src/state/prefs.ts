// Rider preferences (spec C.17), persisted in localStorage["ridemetro.prefs"].

import { setLang, type Lang } from "../i18n/index.ts";
import type { WalkPace } from "../lib/walk.ts";
import { persistentStore } from "../lib/storage.ts";

export type TextSize = "standard" | "large" | "xlarge";

export interface Prefs {
  lang: Lang;
  textSize: TextSize;
  walkPace: WalkPace;
  welcomed: boolean;
}

const browserLang = (): Lang => (typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("es") ? "es" : "en");

const defaults: Prefs = { lang: browserLang(), textSize: "standard", walkPace: "normal", welcomed: false };

const store = persistentStore<Prefs>("ridemetro.prefs", defaults, (stored) => ({ ...defaults, ...stored }));

function apply({ lang, textSize }: Prefs) {
  setLang(lang);
  document.documentElement.lang = lang;
  document.documentElement.dataset.textSize = textSize;
}

apply(store.get());
store.subscribe(() => apply(store.get()));

export function setPrefs(patch: Partial<Prefs>) {
  store.set((prev) => ({ ...prev, ...patch }));
}

export function usePrefs(): Prefs & { set: (patch: Partial<Prefs>) => void } {
  return { ...store.use(), set: setPrefs };
}
