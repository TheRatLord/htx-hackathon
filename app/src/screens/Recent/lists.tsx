import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useReducedMotion } from '../../app/hooks';
import { Icon, type IconName } from '../../components/Icon';
import { Button } from '../../components/ui';
import { getPlace } from '../../data/sampleData';
import type { SavedTrip } from '../../data/types';
import './lists.css';

/*
 * List building blocks shared by the Recent and More tabs: a titled section,
 * a glass card of rows with hairline dividers, and rows that can open
 * something and/or be removed (with a short collapse animation).
 */

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/** How long a removed row takes to collapse before it leaves the state. */
export const EXIT_MS = 280;

export function ListSection({
  id,
  title,
  subtitle,
  action,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rl-section" aria-labelledby={id}>
      <div className="rl-section__head">
        <div className="rl-section__titles">
          {/* Focus lands here after a row is removed, so keyboard users keep their place. */}
          <h2 id={id} tabIndex={-1} className="t-overline rl-section__title">
            {title}
          </h2>
          {subtitle && <p className="t-small t-muted rl-section__sub">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Glass card that holds rows, a skeleton or an empty state. */
export function ListCard({ children, as = 'ul' }: { children: ReactNode; as?: 'ul' | 'div' }) {
  const As = as;
  return <As className="rl-card glass-strong">{children}</As>;
}

export function ListRow({
  icon,
  iconFilled,
  title,
  subtitle,
  meta,
  onOpen,
  chevron = false,
  onRemove,
  removeLabel,
  leaving = false,
}: {
  icon: IconName;
  iconFilled?: boolean;
  title: string;
  subtitle?: string;
  /** Third, quieter line (e.g. a sample address). */
  meta?: string;
  onOpen?: () => void;
  chevron?: boolean;
  onRemove?: () => void;
  /** Accessible name of the Remove button, e.g. "Remove Home". */
  removeLabel?: string;
  leaving?: boolean;
}) {
  const body = (
    <>
      <span className="rl-row__icon" aria-hidden="true">
        <Icon name={icon} size={22} filled={iconFilled} />
      </span>
      <span className="rl-row__text">
        <span className="rl-row__title">{title}</span>
        {subtitle && <span className="rl-row__sub">{subtitle}</span>}
        {meta && <span className="rl-row__meta">{meta}</span>}
      </span>
      {chevron && <Icon name="chevron-right" size={20} className="rl-row__chev" />}
    </>
  );
  return (
    <li className={cx('rl-item', leaving && 'rl-item--leaving')} aria-hidden={leaving || undefined}>
      <div className="rl-item__clip">
        <div className="rl-row">
          {onOpen ? (
            <button type="button" className="rl-row__main" onClick={onOpen} disabled={leaving}>
              {body}
            </button>
          ) : (
            <div className="rl-row__main">{body}</div>
          )}
          {onRemove && (
            <Button
              variant="danger-ghost"
              className="rl-row__remove"
              aria-label={removeLabel}
              onClick={onRemove}
              disabled={leaving}
            >
              Remove
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}

/** Placeholder rows shown while a list "loads". */
export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rl-skeleton" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="rl-skeleton__row" aria-hidden="true">
          <span className="rl-skeleton__icon" />
          <span className="rl-skeleton__lines">
            <span className="rl-skeleton__line" style={{ width: `${72 - i * 12}%` }} />
            <span className="rl-skeleton__line rl-skeleton__line--short" style={{ width: `${48 - i * 8}%` }} />
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Remove a row after it has collapsed. `remove(key, commit, focusId)` marks
 * the row as leaving, then runs `commit` (the dispatch) and moves focus to
 * the element with `focusId`. Under reduced motion it commits at once.
 */
export function useRowExit() {
  const reduced = useReducedMotion();
  const [leaving, setLeaving] = useState<string[]>([]);
  const pending = useRef(new Set<string>());
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach((t) => window.clearTimeout(t));
  }, []);

  const remove = useCallback(
    (key: string, commit: () => void, focusId?: string) => {
      if (pending.current.has(key)) return;
      const finish = () => {
        commit();
        if (focusId) document.getElementById(focusId)?.focus({ preventScroll: true });
      };
      if (reduced) {
        finish();
        return;
      }
      pending.current.add(key);
      setLeaving((l) => [...l, key]);
      const t = window.setTimeout(() => {
        pending.current.delete(key);
        setLeaving((l) => l.filter((k) => k !== key));
        finish();
      }, EXIT_MS);
      timers.current.push(t);
    },
    [reduced],
  );

  const isLeaving = useCallback((key: string) => leaving.includes(key), [leaving]);
  return { remove, isLeaving };
}

/** Saved trip rows, shared by Recent (tap to open) and More (with Remove). */
export function SavedTripRows({
  trips,
  onOpen,
  onRemove,
  isLeaving,
}: {
  trips: SavedTrip[];
  onOpen: (trip: SavedTrip) => void;
  onRemove?: (trip: SavedTrip, name: string) => void;
  isLeaving?: (key: string) => boolean;
}) {
  return (
    <>
      {trips.map((t) => {
        const name = getPlace(t.placeId)?.name ?? 'Saved trip';
        return (
          <ListRow
            key={t.id}
            icon="route"
            title={name}
            subtitle={t.summary}
            onOpen={() => onOpen(t)}
            chevron={!onRemove}
            onRemove={onRemove ? () => onRemove(t, name) : undefined}
            removeLabel={`Remove trip to ${name}`}
            leaving={isLeaving?.(`trip:${t.id}`)}
          />
        );
      })}
    </>
  );
}
