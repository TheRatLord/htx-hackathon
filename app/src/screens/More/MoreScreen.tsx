import { useState } from 'react';
import { useResolvedTheme } from '../../app/hooks';
import { useRouter } from '../../app/router';
import { useStore, type ThemePref } from '../../app/store';
import { Icon } from '../../components/Icon';
import { Page } from '../../components/Page';
import { Button, EmptyState, SegmentedControl } from '../../components/ui';
import { SAVED_PLACES, getPlace } from '../../data/sampleData';
import type { Place } from '../../data/types';
import { ListCard, ListRow, ListSection, SavedTripRows, useRowExit } from '../Recent/lists';
import './MoreScreen.css';

const PLACES_ID = 'more-places-title';
const TRIPS_ID = 'more-trips-title';

const THEME_OPTIONS: { value: ThemePref; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

function restoreLabel(hidden: ('home' | 'work')[]): string {
  if (hidden.length === 1) return `Restore ${hidden[0] === 'home' ? 'Home' : 'Work'}`;
  return 'Restore Home and Work';
}

/** More tab: saved places, saved trips, appearance and a note about the concept. */
export function MoreScreen() {
  const { state, dispatch } = useStore();
  const { navigate } = useRouter();
  const { remove, isLeaving } = useRowExit();
  const resolvedTheme = useResolvedTheme();
  const [announcement, setAnnouncement] = useState('');
  const [resetDone, setResetDone] = useState(false);

  const savedPlaces = SAVED_PLACES.filter((p) => !state.hiddenSavedPlaceIds.includes(p.id));
  const starred = state.starredPlaceIds.map(getPlace).filter((p): p is Place => Boolean(p));
  const hasPlaces = savedPlaces.length + starred.length > 0;
  const hidden = state.hiddenSavedPlaceIds;

  const restore = () => {
    dispatch({ type: 'restoreSavedPlaces' });
    setAnnouncement(`${restoreLabel(hidden).replace(/^Restore /, '')} restored.`);
    document.getElementById(PLACES_ID)?.focus({ preventScroll: true });
  };

  const reset = () => {
    dispatch({ type: 'reset' });
    setResetDone(true);
  };

  return (
    <Page title="More">
      <ListSection id={PLACES_ID} title="Saved places" subtitle="These show as one-tap chips on the map.">
        {hasPlaces ? (
          <>
            <ListCard>
              {savedPlaces.map((sp) => {
                const place = getPlace(sp.placeId);
                const key = `saved:${sp.id}`;
                return (
                  <ListRow
                    key={key}
                    icon="pin"
                    title={sp.label}
                    subtitle="Saved place"
                    meta={place?.area}
                    onOpen={() => navigate({ name: 'routes', placeId: sp.placeId })}
                    onRemove={() =>
                      remove(
                        key,
                        () => {
                          dispatch({ type: 'hideSavedPlace', id: sp.id });
                          setAnnouncement(`${sp.label} removed.`);
                        },
                        PLACES_ID,
                      )
                    }
                    removeLabel={`Remove ${sp.label}`}
                    leaving={isLeaving(key)}
                  />
                );
              })}
              {starred.map((p) => {
                const key = `star:${p.id}`;
                return (
                  <ListRow
                    key={key}
                    icon="star"
                    iconFilled
                    title={p.name}
                    subtitle="Starred place"
                    meta={p.area}
                    onOpen={() => navigate({ name: 'routes', placeId: p.id })}
                    onRemove={() =>
                      remove(
                        key,
                        () => {
                          dispatch({ type: 'toggleStar', placeId: p.id });
                          setAnnouncement(`${p.name} removed.`);
                        },
                        PLACES_ID,
                      )
                    }
                    removeLabel={`Remove ${p.name}`}
                    leaving={isLeaving(key)}
                  />
                );
              })}
            </ListCard>
            {hidden.length > 0 && (
              <div className="more-restore">
                <Button variant="ghost" icon="plus" onClick={restore}>
                  {restoreLabel(hidden)}
                </Button>
              </div>
            )}
          </>
        ) : (
          <ListCard as="div">
            <EmptyState
              icon="star"
              title="No saved places"
              body="Star a place in search to add it here."
              action={
                hidden.length > 0 ? (
                  <Button variant="ghost" icon="plus" onClick={restore}>
                    {restoreLabel(hidden)}
                  </Button>
                ) : undefined
              }
            />
          </ListCard>
        )}
      </ListSection>

      <ListSection id={TRIPS_ID} title="Saved trips">
        {state.savedTrips.length === 0 ? (
          <ListCard as="div">
            <EmptyState icon="route" title="No saved trips" body="Tap Save trip on a trip to keep it here." />
          </ListCard>
        ) : (
          <ListCard>
            <SavedTripRows
              trips={state.savedTrips}
              onOpen={(t) => navigate({ name: 'trip', placeId: t.placeId, optionId: t.optionId })}
              onRemove={(t, name) =>
                remove(
                  `trip:${t.id}`,
                  () => {
                    dispatch({ type: 'removeTrip', id: t.id });
                    setAnnouncement(`Trip to ${name} removed.`);
                  },
                  TRIPS_ID,
                )
              }
              isLeaving={isLeaving}
            />
          </ListCard>
        )}
      </ListSection>

      <ListSection id="more-appearance-title" title="Appearance">
        <div className="more-card glass-strong">
          <div className="more-card__head">
            <span className="more-card__icon" aria-hidden="true">
              <Icon name={resolvedTheme === 'dark' ? 'moon' : 'sun'} size={22} />
            </span>
            <div>
              <p className="more-card__title">Theme</p>
              <p className="t-small t-muted">System matches your phone's setting.</p>
            </div>
          </div>
          <div className="more-theme">
            <SegmentedControl
              label="Theme"
              options={THEME_OPTIONS}
              value={state.theme}
              onChange={(theme) => dispatch({ type: 'setTheme', theme })}
            />
          </div>
        </div>
      </ListSection>

      <ListSection id="more-about-title" title="About">
        <div className="more-card glass-strong">
          <div className="more-card__head">
            <span className="more-card__icon" aria-hidden="true">
              <Icon name="info" size={22} />
            </span>
            <p className="more-about__text">
              RideMETRO redesign concept for Houston Hackathon 2026. Places, stops, times and fares are sample data.
              No account and no METRO data are used.
            </p>
          </div>
          <div className="more-about__actions">
            <Button variant="ghost" onClick={reset}>
              Reset sample data
            </Button>
            <div role="status" className="more-about__status">
              {resetDone && (
                <p className="more-about__note t-small">
                  <Icon name="check" size={18} strokeWidth={2.5} />
                  <span>Sample data restored.</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </ListSection>

      <p role="status" className="sr-only">
        {announcement}
      </p>
    </Page>
  );
}
