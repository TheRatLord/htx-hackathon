import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

/**
 * A tiny hash router. Hash URLs work on any static host with no rewrites,
 * and let tests open any screen directly (e.g. `#/stop/wheeler-bay-f`).
 */

export type Route =
  | { name: 'home'; sheet?: 'peek' | 'half' | 'full' }
  | { name: 'search' }
  | { name: 'routes'; placeId: string }
  | { name: 'trip'; placeId: string; optionId: string }
  | { name: 'stop'; stopId: string }
  | { name: 'fares' }
  | { name: 'recent' }
  | { name: 'more' };

export type Tab = 'trip' | 'fares' | 'recent' | 'more';

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, '').replace(/^\/+/, '');
  const [head, ...rest] = path.split('/').map(decodeURIComponent);
  switch (head) {
    case '':
    case undefined:
      return { name: 'home' };
    case 'nearby':
      return { name: 'home', sheet: 'half' };
    case 'search':
      return { name: 'search' };
    case 'routes':
      return rest[0] ? { name: 'routes', placeId: rest[0] } : { name: 'search' };
    case 'trip':
      return rest[0] && rest[1] ? { name: 'trip', placeId: rest[0], optionId: rest[1] } : { name: 'home' };
    case 'stop':
      return rest[0] ? { name: 'stop', stopId: rest[0] } : { name: 'home' };
    case 'fares':
      return { name: 'fares' };
    case 'recent':
      return { name: 'recent' };
    case 'more':
      return { name: 'more' };
    default:
      return { name: 'home' };
  }
}

export function toHash(route: Route): string {
  const enc = encodeURIComponent;
  switch (route.name) {
    case 'home':
      return route.sheet === 'half' ? '#/nearby' : '#/';
    case 'search':
      return '#/search';
    case 'routes':
      return `#/routes/${enc(route.placeId)}`;
    case 'trip':
      return `#/trip/${enc(route.placeId)}/${enc(route.optionId)}`;
    case 'stop':
      return `#/stop/${enc(route.stopId)}`;
    case 'fares':
    case 'recent':
    case 'more':
      return `#/${route.name}`;
  }
}

export function tabOf(route: Route): Tab {
  if (route.name === 'fares' || route.name === 'recent' || route.name === 'more') return route.name;
  return 'trip';
}

interface RouterValue {
  route: Route;
  navigate: (to: Route, opts?: { replace?: boolean }) => void;
  back: (fallback?: Route) => void;
}

const RouterContext = createContext<RouterValue | null>(null);

export function RouterProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  // How many in-app pushes can be undone with history.back().
  const depth = useRef(0);

  useEffect(() => {
    const onHash = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = useCallback((to: Route, opts?: { replace?: boolean }) => {
    const hash = toHash(to);
    if (opts?.replace) {
      window.history.replaceState(null, '', hash);
      setRoute(parseHash(hash));
    } else if (window.location.hash !== hash) {
      depth.current += 1;
      window.location.hash = hash;
    } else {
      setRoute(parseHash(hash));
    }
  }, []);

  const back = useCallback(
    (fallback: Route = { name: 'home' }) => {
      // A screen opened straight from a link has nothing in-app to go back to.
      if (depth.current > 0) {
        depth.current -= 1;
        window.history.back();
      } else navigate(fallback, { replace: true });
    },
    [navigate],
  );

  const value = useMemo(() => ({ route, navigate, back }), [route, navigate, back]);
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter(): RouterValue {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used inside RouterProvider');
  return ctx;
}
