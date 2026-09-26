import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from '../../app/router';
import { useStore } from '../../app/store';
import { useReducedMotion, useSimulatedLoading } from '../../app/hooks';
import { BottomSheet } from '../../components/BottomSheet';
import { Icon } from '../../components/Icon';
import {
  Button,
  ConceptLabel,
  EmptyState,
  IconButton,
  RouteBadge,
  SegmentedControl,
  Skeleton,
  StatusTag,
} from '../../components/ui';
import { USER_POSITION } from '../../data/geography';
import { getPlace } from '../../data/sampleData';
import type { Leg, LngLat, RouteOption, RouteOptionId } from '../../data/types';
import { STATUS_LABEL, formatClock } from '../../lib/format';
import { pointAlong } from '../../lib/geo';
import {
  optionPath,
  optionStatus,
  optionTags,
  planRoutes,
  sortRoutes,
  totalMinutes,
  type SortMode,
} from '../../lib/trips';
import { useMapScene, type MapScene } from '../../map/scene';
import './RouteOptionsScreen.css';

/**
 * The default (lowest) snap peeks the first card's arrive time, tag and status
 * and leaves the map room to show all three routes: the sample basemap ends
 * just south of the zoo, so a taller sheet would push the routes under it.
 * The middle snap shows every card; the top one scrolls.
 */
const SHEET_SNAPS = [0.42, 0.66, 0.92];
/** Height of the sticky Start trip footer, so the last card can scroll above it. */
const FOOTER_SPACE = 56 + 16 * 2;
/** Bottom edge of the from/to card, in px from the top of the screen. */
const TOP_CARD_BOTTOM = 16 + 106;

const OPTION_VAR: Record<RouteOptionId, string> = {
  A: 'var(--route-a)',
  B: 'var(--route-b)',
  C: 'var(--route-c)',
};

/** Where along its first ride each letter badge sits, so the three never stack. */
const BADGE_AT: Record<RouteOptionId, number> = { A: 0.3, B: 0.6, C: 0.4 };

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'fastest', label: 'Fastest' },
  { value: 'least-walking', label: 'Least walking' },
];

const TAG_LABEL = { fastest: 'Fastest', 'least-walking': 'Least walking' } as const;

type Ride = Extract<Leg, { kind: 'ride' }>;

function legLabel(l: Leg): string {
  if (l.kind === 'walk') return `walk ${l.minutes} min`;
  if (l.kind === 'ride') return `route ${l.lineId} for ${l.rideMinutes} min`;
  return `transfer, wait ${l.minutes} min`;
}

export function RouteOptionsScreen({ placeId }: { placeId: string }) {
  const place = getPlace(placeId);
  if (!place) return <MissingPlace />;
  return <RouteOptions placeId={placeId} placeName={place.name} placePosition={place.position} />;
}

function MissingPlace() {
  const { back, navigate } = useRouter();
  // Controls off: the empty-state card sits where the locate button would be.
  const scene = useMemo<MapScene>(() => ({ showControls: false }), []);
  useMapScene(scene);
  return (
    <div className="map-overlay ro screen-enter">
      <div className="ro__top">
        <IconButton icon="chevron-left" label="Back" onClick={() => back({ name: 'search' })} />
      </div>
      <div className="ro__missing glass-strong">
        <h1 className="sr-only">Route options</h1>
        <EmptyState
          icon="pin"
          title="We couldn't find that place"
          body="The link may be out of date. Search again to plan your trip."
          action={
            <Button icon="search" onClick={() => navigate({ name: 'search' })}>
              Search places
            </Button>
          }
        />
      </div>
    </div>
  );
}

function RouteOptions({
  placeId,
  placeName,
  placePosition,
}: {
  placeId: string;
  placeName: string;
  placePosition: LngLat;
}) {
  const { back, navigate } = useRouter();
  const { state, dispatch } = useStore();
  const reducedMotion = useReducedMotion();
  const loading = useSimulatedLoading(`routes-${placeId}`);
  const options = useMemo(() => planRoutes(placeId), [placeId]);
  const tags = useMemo(() => optionTags(options), [options]);
  const [sort, setSort] = useState<SortMode>('fastest');
  const sorted = useMemo(() => sortRoutes(options, sort), [options, sort]);
  const [selectedId, setSelectedId] = useState<RouteOptionId>(
    () => sortRoutes(options, 'fastest')[0]?.id ?? 'A',
  );
  const starred = state.starredPlaceIds.includes(placeId);

  // Opening route options counts as visiting the destination.
  useEffect(() => {
    dispatch({ type: 'visitPlace', placeId });
  }, [dispatch, placeId]);

  const scene = useMemo<MapScene>(
    () => ({
      routes: loading
        ? []
        : options.map((o) => {
            const firstRide = o.legs.find((l): l is Ride => l.kind === 'ride');
            return {
              id: o.id,
              color: OPTION_VAR[o.id],
              selected: o.id === selectedId,
              paths: o.legs.flatMap((l) => (l.kind === 'wait' ? [] : [{ kind: l.kind, coords: l.path }])),
              badge: firstRide ? { label: o.id, position: pointAlong(firstRide.path, BADGE_AT[o.id]) } : undefined,
            };
          }),
      destination: { position: placePosition, label: placeName },
      fit: [USER_POSITION, placePosition, ...options.flatMap(optionPath)],
      fitKey: `routes-${placeId}`,
      // The map adds 24px to this, which leaves a 16px gap under the card.
      paddingTop: TOP_CARD_BOTTOM - 8,
      controlsTop: TOP_CARD_BOTTOM + 16,
      onRouteClick: (id) => {
        if (id === 'A' || id === 'B' || id === 'C') setSelectedId(id);
      },
    }),
    [loading, options, selectedId, placePosition, placeName, placeId],
  );
  useMapScene(scene);

  // Smooth reordering when the sort changes: remember where each card was, then slide it from there.
  const cardRefs = useRef(new Map<RouteOptionId, HTMLElement>());
  const prevTops = useRef<Map<RouteOptionId, number> | null>(null);
  const changeSort = (next: SortMode) => {
    if (next === sort) return;
    const tops = new Map<RouteOptionId, number>();
    cardRefs.current.forEach((el, id) => tops.set(id, el.getBoundingClientRect().top));
    prevTops.current = tops;
    setSort(next);
  };
  useLayoutEffect(() => {
    const before = prevTops.current;
    prevTops.current = null;
    if (!before || reducedMotion) return;
    cardRefs.current.forEach((el, id) => {
      const from = before.get(id);
      if (from === undefined || typeof el.animate !== 'function') return;
      const dy = from - el.getBoundingClientRect().top;
      if (Math.abs(dy) < 1) return;
      el.animate([{ transform: `translateY(${dy}px)` }, { transform: 'translateY(0)' }], {
        duration: 380,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
      });
    });
  }, [sort, reducedMotion]);

  const startTrip = () => {
    dispatch({ type: 'startTrip', placeId, optionId: selectedId });
    navigate({ name: 'trip', placeId, optionId: selectedId });
  };

  const header = (
    <div className="ro-sort">
      <SegmentedControl label="Sort routes" options={SORT_OPTIONS} value={sort} onChange={changeSort} />
      <p className="ro-sort__note t-caption t-muted">
        <Icon name="route" size={16} />
        All routes shown
      </p>
    </div>
  );

  const footer = (
    <Button size="lg" block onClick={startTrip} disabled={loading}>
      Start trip · Route {selectedId}
    </Button>
  );

  return (
    <div className="map-overlay ro screen-enter">
      <div className="ro__top">
        <IconButton icon="chevron-left" label="Back" onClick={() => back({ name: 'search' })} />
        <div className="ro-fromto glass-strong">
          <p className="ro-fromto__row ro-fromto__row--from">
            <span className="ro-fromto__dot" aria-hidden="true" />
            <span className="sr-only">From: </span>
            <span className="ro-fromto__text">Current location</span>
          </p>
          <span className="ro-fromto__link" aria-hidden="true" />
          <div className="ro-fromto__row ro-fromto__row--to">
            <span className="ro-fromto__square" aria-hidden="true" />
            <h1 className="ro-fromto__text ro-fromto__dest">
              <span className="sr-only">Routes to </span>
              {placeName}
            </h1>
            <button
              type="button"
              className={`ro-star${starred ? ' ro-star--on' : ''}`}
              aria-label={`Save ${placeName}`}
              aria-pressed={starred}
              onClick={() => dispatch({ type: 'toggleStar', placeId })}
            >
              <Icon name="star" size={24} filled={starred} />
            </button>
          </div>
        </div>
      </div>

      <BottomSheet
        label="Route options"
        snapPoints={SHEET_SNAPS}
        header={header}
        footer={footer}
        bottomPadding={FOOTER_SPACE}
        className="ro-sheet"
      >
        <h2 className="sr-only">
          {options.length} routes to {placeName}, sorted by {sort === 'fastest' ? 'fastest' : 'least walking'}
        </h2>
        {loading ? (
          <div className="ro-list" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="ro-card ro-card--loading">
                <span className="ro-card__skel-letter" />
                <Skeleton lines={3} />
              </div>
            ))}
          </div>
        ) : options.length === 0 ? (
          <EmptyState icon="route" title="No routes right now" body="Try again in a few minutes." />
        ) : (
          <ul className="ro-list" aria-label="Route options">
            {sorted.map((o) => (
              <li
                key={o.id}
                ref={(el) => {
                  if (el) cardRefs.current.set(o.id, el);
                  else cardRefs.current.delete(o.id);
                }}
              >
                <OptionCard
                  option={o}
                  tags={tags[o.id]}
                  selected={o.id === selectedId}
                  onSelect={() => setSelectedId(o.id)}
                />
              </li>
            ))}
          </ul>
        )}
        <ConceptLabel className="ro__concept" />
      </BottomSheet>
    </div>
  );
}

function OptionCard({
  option: o,
  tags,
  selected,
  onSelect,
}: {
  option: RouteOption;
  tags: ('fastest' | 'least-walking')[];
  selected: boolean;
  onSelect: () => void;
}) {
  const status = optionStatus(o);
  const total = totalMinutes(o);
  const arrive = formatClock(o.arriveAt);
  const leave = formatClock(o.leaveBy);
  const tagText = tags.map((t) => TAG_LABEL[t]).join(', ');
  const label =
    `Route ${o.id}: arrive ${arrive}, ${total} min. ` +
    (tagText ? `${tagText}. ` : '') +
    `Leave by ${leave}. ${STATUS_LABEL[status]}. ` +
    `${o.legs.map(legLabel).join(', then ')}.`;

  return (
    <button
      type="button"
      className={`ro-card${selected ? ' ro-card--selected' : ''}`}
      style={{ ['--opt' as string]: OPTION_VAR[o.id] }}
      aria-pressed={selected}
      aria-label={label}
      data-option={o.id}
      onClick={onSelect}
    >
      <span className="ro-card__head">
        <span className="ro-card__letter" aria-hidden="true">
          {o.id}
        </span>
        <span className="ro-card__arrive t-title-sm tabular">Arrive {arrive}</span>
        <span className="ro-card__total t-title-sm tabular">{total} min</span>
      </span>
      <span className="ro-card__meta">
        <span className="ro-card__when">
          {tags.map((t) => (
            <span key={t} className="ro-card__tag">
              {TAG_LABEL[t]}
            </span>
          ))}
          <span className="ro-card__leave tabular">Leave by {leave}</span>
        </span>
        <StatusTag status={status} short />
      </span>
      <span className="ro-card__legs" aria-hidden="true">
        {o.legs.map((l, i) => (
          <LegPill key={i} leg={l} />
        ))}
      </span>
    </button>
  );
}

function LegPill({ leg }: { leg: Leg }) {
  if (leg.kind === 'ride')
    return (
      <span className="ro-pill ro-pill--ride">
        <RouteBadge lineId={leg.lineId} size="sm" />
        <span className="tabular">{leg.rideMinutes} min</span>
      </span>
    );
  return (
    <span className={`ro-pill ro-pill--${leg.kind}`}>
      <Icon name={leg.kind === 'walk' ? 'walk' : 'transfer'} size={18} />
      <span className="tabular">{leg.minutes} min</span>
    </span>
  );
}
