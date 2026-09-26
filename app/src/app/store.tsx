import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import type { RouteOptionId, SavedTrip } from '../data/types';

/**
 * Rider state kept on this device only (no accounts in the concept).
 * Persisted to localStorage when available; the app works without it.
 */

export type ThemePref = 'system' | 'light' | 'dark';

export interface AppState {
  /** Starred places (place ids), shown as chips next to Home and Work. */
  starredPlaceIds: string[];
  savedTrips: SavedTrip[];
  /** Recent destinations, newest first, max 8. */
  recentPlaceIds: string[];
  theme: ThemePref;
  /** Trip in progress, if the rider pressed Start trip. */
  activeTrip: { placeId: string; optionId: RouteOptionId } | null;
  /** Home and Work can be removed from More; removed ones hide their chip. */
  hiddenSavedPlaceIds: ('home' | 'work')[];
}

export const initialState: AppState = {
  starredPlaceIds: [],
  savedTrips: [
    {
      id: 'trip-sample-zoo',
      placeId: 'houston-zoo',
      optionId: 'C',
      summary: 'Route 700 + 65 · 34 min',
      savedAt: 0,
    },
  ],
  recentPlaceIds: ['houston-zoo', 'mfah', 'heb-midtown'],
  theme: 'system',
  activeTrip: null,
  hiddenSavedPlaceIds: [],
};

export type Action =
  | { type: 'toggleStar'; placeId: string }
  | { type: 'saveTrip'; trip: SavedTrip }
  | { type: 'removeTrip'; id: string }
  | { type: 'visitPlace'; placeId: string }
  | { type: 'clearRecents' }
  | { type: 'setTheme'; theme: ThemePref }
  | { type: 'startTrip'; placeId: string; optionId: RouteOptionId }
  | { type: 'endTrip' }
  | { type: 'hideSavedPlace'; id: 'home' | 'work' }
  | { type: 'restoreSavedPlaces' }
  | { type: 'reset' };

const MAX_RECENTS = 8;

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'toggleStar': {
      const has = state.starredPlaceIds.includes(action.placeId);
      return {
        ...state,
        starredPlaceIds: has
          ? state.starredPlaceIds.filter((id) => id !== action.placeId)
          : [...state.starredPlaceIds, action.placeId],
      };
    }
    case 'saveTrip': {
      const exists = state.savedTrips.some(
        (t) => t.placeId === action.trip.placeId && t.optionId === action.trip.optionId,
      );
      return exists ? state : { ...state, savedTrips: [action.trip, ...state.savedTrips] };
    }
    case 'removeTrip':
      return { ...state, savedTrips: state.savedTrips.filter((t) => t.id !== action.id) };
    case 'visitPlace':
      return {
        ...state,
        recentPlaceIds: [action.placeId, ...state.recentPlaceIds.filter((id) => id !== action.placeId)].slice(
          0,
          MAX_RECENTS,
        ),
      };
    case 'clearRecents':
      return { ...state, recentPlaceIds: [] };
    case 'setTheme':
      return { ...state, theme: action.theme };
    case 'startTrip':
      return { ...state, activeTrip: { placeId: action.placeId, optionId: action.optionId } };
    case 'endTrip':
      return { ...state, activeTrip: null };
    case 'hideSavedPlace':
      return state.hiddenSavedPlaceIds.includes(action.id)
        ? state
        : { ...state, hiddenSavedPlaceIds: [...state.hiddenSavedPlaceIds, action.id] };
    case 'restoreSavedPlaces':
      return { ...state, hiddenSavedPlaceIds: [] };
    case 'reset':
      return initialState;
  }
}

export const STORAGE_KEY = 'ridemetro-concept:v1';

export function loadState(): AppState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return { ...initialState, ...parsed, activeTrip: parsed.activeTrip ?? null };
  } catch {
    return initialState;
  }
}

function saveState(state: AppState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* Private mode or storage blocked: state just won't persist. */
  }
}

const StoreContext = createContext<{ state: AppState; dispatch: (a: Action) => void } | null>(null);

export function StoreProvider({ children, initial }: { children: ReactNode; initial?: AppState }) {
  const [state, dispatch] = useReducer(reducer, initial ?? initialState, (s) => (initial ? s : loadState()));

  useEffect(() => saveState(state), [state]);

  // Apply the theme choice to <html data-theme>. "system" follows the OS.
  useEffect(() => {
    const root = document.documentElement;
    if (state.theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', state.theme);
  }, [state.theme]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
