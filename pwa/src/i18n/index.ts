// Every user-facing string goes through t(). Each file in ./strings exports
// `{ en, es }` dictionaries whose nested keys flatten to "namespace.key"; a
// module adds its own file and never edits another's.

import { useCallback, useSyncExternalStore } from "react";
import { createSignal } from "../lib/signal.ts";

export type Lang = "en" | "es";
export type Vars = Record<string, string | number>;

interface Dict {
  [key: string]: string | Dict;
}

export interface Strings {
  en: Dict;
  es: Dict;
}

const tables: Record<Lang, Map<string, string>> = { en: new Map(), es: new Map() };

function flatten(dict: Dict, prefix: string, into: Map<string, string>) {
  for (const [k, v] of Object.entries(dict)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") {
      if (into.has(key) && import.meta.env.DEV) console.warn(`i18n: duplicate key "${key}"`);
      into.set(key, v);
    } else flatten(v, key, into);
  }
}

for (const mod of Object.values(import.meta.glob<{ default: Strings }>("./strings/*.ts", { eager: true }))) {
  flatten(mod.default.en, "", tables.en);
  flatten(mod.default.es, "", tables.es);
}

let current: Lang = "en";
const signal = createSignal();

export function setLang(lang: Lang) {
  if (lang === current) return;
  current = lang;
  signal.notify();
}

export function getLang(): Lang {
  return current;
}

const plurals: Record<Lang, Intl.PluralRules> = { en: new Intl.PluralRules("en"), es: new Intl.PluralRules("es") };

function lookup(key: string, lang: Lang, count?: number): string | undefined {
  const table = tables[lang];
  if (count !== undefined) {
    const plural = table.get(`${key}.${plurals[lang].select(count)}`) ?? table.get(`${key}.other`);
    if (plural !== undefined) return plural;
  }
  return table.get(key);
}

export function hasKey(key: string, lang: Lang = current): boolean {
  return lookup(key, lang) !== undefined || lookup(key, lang, 1) !== undefined;
}

/**
 * Localised text for `key`, with `{name}` placeholders filled from `vars`. A numeric
 * `vars.count` picks the `.one` / `.other` sub-key. Falls back to English, then the key.
 */
export function t(key: string, vars?: Vars, lang: Lang = current): string {
  const count = typeof vars?.count === "number" ? vars.count : undefined;
  const text = lookup(key, lang, count) ?? lookup(key, "en", count);
  if (text === undefined) {
    if (import.meta.env.DEV) console.warn(`i18n: missing key "${key}"`);
    return key;
  }
  return vars ? text.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m)) : text;
}

const { subscribe } = signal;

/**
 * t() bound to the current language; re-renders the caller when the language changes. The
 * function is stable while the language stays the same, so effects can list it as a dependency.
 */
export function useT(): (key: string, vars?: Vars) => string {
  const lang = useSyncExternalStore(subscribe, getLang, getLang);
  return useCallback((key: string, vars?: Vars) => t(key, vars, lang), [lang]);
}

export function useLang(): Lang {
  return useSyncExternalStore(subscribe, getLang, getLang);
}
