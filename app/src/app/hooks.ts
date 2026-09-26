import { useEffect, useState } from 'react';
import { useStore } from './store';

function useMediaQuery(query: string): boolean {
  const get = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false);
  const [matches, setMatches] = useState(get);
  useEffect(() => {
    if (!window.matchMedia) return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

export function useReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

/** The theme actually showing: the rider's choice, or the OS setting for "system". */
export function useResolvedTheme(): 'light' | 'dark' {
  const { state } = useStore();
  const osDark = useMediaQuery('(prefers-color-scheme: dark)');
  if (state.theme === 'system') return osDark ? 'dark' : 'light';
  return state.theme;
}

/**
 * Pretend to fetch for a moment so loading states are real and visible.
 * Returns true while "loading". Changes to `key` restart it.
 */
export function useSimulatedLoading(key: string, ms = 450): boolean {
  const [loadingKey, setLoadingKey] = useState<string | null>(key);
  useEffect(() => {
    setLoadingKey(key);
    const t = window.setTimeout(() => setLoadingKey(null), ms);
    return () => window.clearTimeout(t);
  }, [key, ms]);
  return loadingKey === key;
}
