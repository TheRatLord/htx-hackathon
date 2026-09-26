import { useEffect, useMemo, useState } from 'react';
import { useRouter } from '../../app/router';
import { useStore } from '../../app/store';
import { useSimulatedLoading } from '../../app/hooks';
import { BottomSheet } from '../../components/BottomSheet';
import { Icon } from '../../components/Icon';
import { Chip, ConceptLabel, EmptyState, Overline, RouteBadge, Skeleton, StatusTag } from '../../components/ui';
import { SAVED_PLACES, getPlace } from '../../data/sampleData';
import { formatCountdown } from '../../lib/format';
import { fastestMinutes, nearbyStops, nextDeparture } from '../../lib/trips';
import { useMapScene, type MapScene } from '../../map/scene';
import { USER_POSITION } from '../../data/geography';
import './HomeScreen.css';

const SHEET_SNAPS = [212, 0.52, 0.9];
/** Space the floating tab bar takes over the sheet. */
const TABBAR_SPACE = 72 + 16 * 2;

export function HomeScreen({ sheet }: { sheet?: 'peek' | 'half' | 'full' }) {
  const { navigate } = useRouter();
  const { state } = useStore();
  const stops = useMemo(() => nearbyStops(), []);
  const [sheetIndex, setSheetIndex] = useState(sheet === 'half' ? 1 : sheet === 'full' ? 2 : 0);
  const loading = useSimulatedLoading('nearby');

  useEffect(() => {
    if (sheet === 'half') setSheetIndex(1);
    else if (sheet === 'full') setSheetIndex(2);
  }, [sheet]);

  const scene = useMemo<MapScene>(
    () => ({
      stops: stops.map((s) => ({
        id: s.stop.id,
        position: s.stop.position,
        label: String(s.rank),
        caption: `${s.walkMinutes} min`,
      })),
      fit: [USER_POSITION, ...stops.map((s) => s.stop.position)],
      // Refit when the sheet moves between tucked and half, so pins stay visible.
      fitKey: `home-${Math.min(sheetIndex, 1)}`,
      paddingTop: 184,
      controlsTop: 184,
      onStopClick: (id) => navigate({ name: 'stop', stopId: id }),
    }),
    [stops, navigate, sheetIndex],
  );
  useMapScene(scene);

  const nearest = stops[0];
  const next = nearest ? nextDeparture(nearest.stop) : undefined;
  const maxWalk = Math.max(...stops.map((s) => s.walkMinutes));

  const savedChips = SAVED_PLACES.filter((p) => !state.hiddenSavedPlaceIds.includes(p.id));
  const starred = state.starredPlaceIds.map(getPlace).filter((p) => !!p);

  const header = (
    <button
      type="button"
      className="near-peek"
      onClick={() => setSheetIndex(sheetIndex === 0 ? 1 : 0)}
      aria-label={sheetIndex === 0 ? 'Show nearby stops' : 'Hide nearby stops'}
    >
      <span className="near-peek__text">
        <span className="t-title-sm">Near you</span>
        <span className="t-small t-muted">
          {stops.length} stops within a {maxWalk} min walk
        </span>
      </span>
      {next && (
        <span className="near-peek__next">
          <RouteBadge lineId={next.lineId} />
          <span className="near-peek__time">
            <span className="t-title-sm tabular">{formatCountdown(next.inMinutes)}</span>
            <StatusTag status={next.status} short />
          </span>
        </span>
      )}
      <Icon name={sheetIndex === 0 ? 'chevron-up' : 'chevron-down'} className="near-peek__chev" />
    </button>
  );

  return (
    <div className="map-overlay home">
      <div className="home__top">
        <button type="button" className="search-bar glass-strong" onClick={() => navigate({ name: 'search' })}>
          <Icon name="search" size={24} />
          <span className="search-bar__placeholder">Where to?</span>
          <Icon name="mic" size={22} className="search-bar__mic" />
        </button>
        <div className="home__chips" role="list" aria-label="Saved places">
          {savedChips.map((p) => {
            const mins = fastestMinutes(p.placeId);
            return (
              <span role="listitem" key={p.id}>
                <Chip
                  icon={p.icon}
                  label={p.label}
                  meta={mins !== undefined ? `${mins} min` : undefined}
                  onClick={() => navigate({ name: 'routes', placeId: p.placeId })}
                />
              </span>
            );
          })}
          {starred.map((p) => (
            <span role="listitem" key={p.id}>
              <Chip icon="star" iconFilled label={p.name} onClick={() => navigate({ name: 'routes', placeId: p.id })} />
            </span>
          ))}
          <span role="listitem">
            <Chip icon="star" label="Saved" onClick={() => navigate({ name: 'more' })} />
          </span>
        </div>
      </div>

      <div className="home__concept glass-strong" style={{ bottom: 212 + 16 }}>
        <ConceptLabel />
      </div>

      <BottomSheet
        label="Nearby stops"
        snapPoints={SHEET_SNAPS}
        index={sheetIndex}
        onIndexChange={setSheetIndex}
        header={header}
        bottomPadding={TABBAR_SPACE}
        hideBodyAtFirstSnap
      >
        <Overline>Nearest stops</Overline>
        {loading ? (
          <div className="near-list">
            {[0, 1, 2].map((i) => (
              <div key={i} className="near-card near-card--loading">
                <Skeleton lines={2} />
              </div>
            ))}
          </div>
        ) : stops.length === 0 ? (
          <EmptyState icon="pin" title="No stops nearby" body="Try moving the map or searching for a place." />
        ) : (
          <ol className="near-list">
            {stops.map((s) => {
              const n = nextDeparture(s.stop);
              return (
                <li key={s.stop.id}>
                  <button
                    type="button"
                    className="near-card"
                    onClick={() => navigate({ name: 'stop', stopId: s.stop.id })}
                  >
                    <span className="near-card__rank" aria-label={`Stop ${s.rank}`}>
                      {s.rank}
                    </span>
                    <span className="near-card__main">
                      <span className="near-card__name">{s.stop.name}</span>
                      <span className="near-card__meta t-small t-muted">
                        <Icon name="walk" size={16} /> {s.walkMinutes} min walk
                      </span>
                      <span className="near-card__routes">
                        {s.stop.routes.map((r) => (
                          <RouteBadge key={r.lineId + r.direction} lineId={r.lineId} size="sm" />
                        ))}
                      </span>
                    </span>
                    {n && (
                      <span className="near-card__next">
                        <span className="t-title-sm tabular">{formatCountdown(n.inMinutes)}</span>
                        <StatusTag status={n.status} short />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
        )}

        <Overline>Saved trips</Overline>
        {state.savedTrips.length === 0 ? (
          <EmptyState
            icon="route"
            title="No saved trips yet"
            body="Plan a trip and tap Save trip to keep it here."
          />
        ) : (
          <ul className="saved-trips">
            {state.savedTrips.map((t) => {
              const place = getPlace(t.placeId);
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    className="saved-trip"
                    onClick={() => navigate({ name: 'trip', placeId: t.placeId, optionId: t.optionId })}
                  >
                    <Icon name="route" size={22} />
                    <span className="saved-trip__text">
                      <span className="saved-trip__name">{place?.name ?? 'Trip'}</span>
                      <span className="t-small t-muted">{t.summary}</span>
                    </span>
                    <Icon name="chevron-right" size={20} className="saved-trip__chev" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </BottomSheet>
    </div>
  );
}
