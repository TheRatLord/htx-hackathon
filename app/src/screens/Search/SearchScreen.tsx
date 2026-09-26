import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { useRouter } from '../../app/router';
import { useStore } from '../../app/store';
import { Icon, type IconName } from '../../components/Icon';
import { Button, ConceptLabel, EmptyState, IconButton, Overline } from '../../components/ui';
import { SAVED_PLACES, getPlace, searchPlaces } from '../../data/sampleData';
import type { Place } from '../../data/types';
import { fastestMinutes } from '../../lib/trips';
import { useMapScene, type MapScene } from '../../map/scene';
import './SearchScreen.css';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/** Wrap the first case-insensitive match of `query` in `name` with <mark>. */
function highlight(name: string, query: string): ReactNode {
  const q = query.trim();
  const at = q ? name.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (at < 0) return name;
  return (
    <>
      {name.slice(0, at)}
      <mark className="search-mark">{name.slice(at, at + q.length)}</mark>
      {name.slice(at + q.length)}
    </>
  );
}

/** One tappable row: leading icon, title, subtitle, optional trailing content. */
function PlaceRow({
  icon,
  iconFilled,
  title,
  subtitle,
  label,
  trailing,
  onClick,
  aside,
}: {
  icon: IconName;
  iconFilled?: boolean;
  title: ReactNode;
  subtitle: string;
  /** Accessible name when the visible text would read poorly. */
  label?: string;
  trailing?: ReactNode;
  onClick: () => void;
  /** A separate control next to the row (the save star). */
  aside?: ReactNode;
}) {
  return (
    <li className="search-row">
      <button type="button" className="search-row__main" onClick={onClick} aria-label={label}>
        <span className="search-row__icon" aria-hidden="true">
          <Icon name={icon} size={22} filled={iconFilled} />
        </span>
        <span className="search-row__text">
          <span className="search-row__title">{title}</span>
          <span className="search-row__sub">{subtitle}</span>
        </span>
        {trailing}
      </button>
      {aside}
    </li>
  );
}

export function SearchScreen() {
  const { navigate, back } = useRouter();
  const { state, dispatch } = useStore();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // A calm map behind the frosted panel: no pins, no controls.
  const scene = useMemo<MapScene>(() => ({ showControls: false }), []);
  useMapScene(scene);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const trimmed = query.trim();
  const results = useMemo(() => searchPlaces(trimmed), [trimmed]);

  const savedPlaces = SAVED_PLACES.filter((p) => !state.hiddenSavedPlaceIds.includes(p.id));
  const savedPlaceIds = new Set(SAVED_PLACES.map((p) => p.placeId));
  const starred = state.starredPlaceIds
    .filter((id) => !savedPlaceIds.has(id))
    .map(getPlace)
    .filter((p): p is Place => !!p);
  const recents = state.recentPlaceIds.map(getPlace).filter((p): p is Place => !!p);

  const openPlace = (placeId: string, remember = true) => {
    if (remember) dispatch({ type: 'visitPlace', placeId });
    navigate({ name: 'routes', placeId });
  };

  const clear = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const first = results[0];
    if (first) openPlace(first.id);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape' && query) {
      e.preventDefault();
      setQuery('');
    }
  };

  const starButton = (place: Place) => {
    const on = state.starredPlaceIds.includes(place.id);
    return (
      <button
        type="button"
        className={cx('icon-btn', 'search-star', on && 'search-star--on')}
        aria-label={on ? `Remove ${place.name} from saved` : `Save ${place.name}`}
        aria-pressed={on}
        onClick={() => dispatch({ type: 'toggleStar', placeId: place.id })}
      >
        <Icon name="star" size={24} filled={on} />
      </button>
    );
  };

  const status = trimmed
    ? results.length === 0
      ? 'No matching places'
      : `${results.length} ${results.length === 1 ? 'place' : 'places'} found`
    : '';

  return (
    <div className="map-overlay search">
      <div className="search__panel screen-enter">
        <h1 className="sr-only">Search</h1>
        <div className="search__top">
          <IconButton
            icon="chevron-left"
            label="Back"
            className="search__back"
            onClick={() => back({ name: 'home' })}
          />
          <form className="search-field glass-strong" role="search" onSubmit={onSubmit}>
            <Icon name="search" size={24} className="search-field__icon" />
            <input
              ref={inputRef}
              type="search"
              className="search-field__input"
              placeholder="Where to?"
              aria-label="Search for a place"
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
            />
            {query && (
              <IconButton icon="close" label="Clear search" glass={false} className="search-field__clear" onClick={clear} />
            )}
          </form>
        </div>

        <p className="sr-only" role="status" aria-live="polite">
          {status}
        </p>

        <div className="search__body">
          {trimmed ? (
            results.length > 0 ? (
              <section className="search__section" aria-labelledby="search-places">
                <Overline>
                  <span id="search-places">Places</span>
                </Overline>
                <ul className="search-list">
                  {results.map((p) => (
                    <PlaceRow
                      key={p.id}
                      icon="pin"
                      title={highlight(p.name, trimmed)}
                      subtitle={p.area}
                      label={`${p.name}, ${p.area}`}
                      onClick={() => openPlace(p.id)}
                      aside={starButton(p)}
                    />
                  ))}
                </ul>
              </section>
            ) : (
              <div className="search__empty">
                <EmptyState
                  icon="search"
                  title={`No places match “${trimmed}”`}
                  body="This concept only knows a few sample places. Try “zoo”."
                  action={
                    <Button variant="ghost" icon="search" onClick={() => setQuery('zoo')}>
                      Search for zoo
                    </Button>
                  }
                />
              </div>
            )
          ) : (
            <>
              {(savedPlaces.length > 0 || starred.length > 0) && (
                <section className="search__section" aria-labelledby="search-saved">
                  <Overline>
                    <span id="search-saved">Saved</span>
                  </Overline>
                  <ul className="search-list">
                    {savedPlaces.map((s) => {
                      const place = getPlace(s.placeId);
                      const mins = fastestMinutes(s.placeId);
                      return (
                        <PlaceRow
                          key={s.id}
                          icon={s.icon}
                          title={s.label}
                          subtitle={place?.area ?? 'Saved place'}
                          onClick={() => openPlace(s.placeId, false)}
                          trailing={
                            mins !== undefined && (
                              <span className="search-row__meta">
                                <span className="tabular">{mins} min</span>
                                <span className="sr-only"> by transit</span>
                              </span>
                            )
                          }
                        />
                      );
                    })}
                    {starred.map((p) => (
                      <PlaceRow
                        key={p.id}
                        icon="star"
                        iconFilled
                        title={p.name}
                        subtitle={p.area}
                        onClick={() => openPlace(p.id)}
                        trailing={<Icon name="chevron-right" size={20} className="search-row__chev" />}
                      />
                    ))}
                  </ul>
                </section>
              )}

              {recents.length > 0 && (
                <section className="search__section" aria-labelledby="search-recent">
                  <Overline>
                    <span id="search-recent">Recent</span>
                  </Overline>
                  <ul className="search-list">
                    {recents.map((p) => (
                      <PlaceRow
                        key={p.id}
                        icon="clock"
                        title={p.name}
                        subtitle={p.area}
                        onClick={() => openPlace(p.id)}
                        trailing={<Icon name="chevron-right" size={20} className="search-row__chev" />}
                      />
                    ))}
                  </ul>
                </section>
              )}

              {savedPlaces.length === 0 && starred.length === 0 && recents.length === 0 && (
                <div className="search__empty">
                  <EmptyState
                    icon="search"
                    title="Search for a place"
                    body="Places you save or visit show up here. Try “zoo”."
                  />
                </div>
              )}
            </>
          )}
        </div>

        <footer className="search__foot">
          <ConceptLabel />
        </footer>
      </div>
    </div>
  );
}
