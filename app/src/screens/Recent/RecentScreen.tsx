import { useState } from 'react';
import { useSimulatedLoading } from '../../app/hooks';
import { useRouter } from '../../app/router';
import { useStore } from '../../app/store';
import { Page } from '../../components/Page';
import { Button, EmptyState } from '../../components/ui';
import { getPlace } from '../../data/sampleData';
import type { Place } from '../../data/types';
import { ListCard, ListRow, ListSection, ListSkeleton, SavedTripRows } from './lists';
import './RecentScreen.css';

const RECENTS_ID = 'recent-destinations-title';
const TRIPS_ID = 'recent-trips-title';

/** Recent tab: places the rider planned trips to, and their saved trips. */
export function RecentScreen() {
  const { state, dispatch } = useStore();
  const { navigate } = useRouter();
  const loading = useSimulatedLoading('recent');
  const [announcement, setAnnouncement] = useState('');

  const recents = state.recentPlaceIds.map(getPlace).filter((p): p is Place => Boolean(p));

  const clear = () => {
    dispatch({ type: 'clearRecents' });
    setAnnouncement('Recent destinations cleared.');
    document.getElementById(RECENTS_ID)?.focus({ preventScroll: true });
  };

  return (
    <Page title="Recent">
      <ListSection
        id={RECENTS_ID}
        title="Recent destinations"
        action={
          !loading && recents.length > 0 ? (
            <Button variant="ghost" className="recent-clear" onClick={clear} aria-label="Clear recent destinations">
              Clear
            </Button>
          ) : undefined
        }
      >
        {loading ? (
          <ListCard as="div">
            <ListSkeleton rows={3} />
          </ListCard>
        ) : recents.length === 0 ? (
          <ListCard as="div">
            <EmptyState
              icon="clock"
              title="No recent destinations"
              body="Places you plan trips to show up here."
              action={
                <Button icon="search" onClick={() => navigate({ name: 'search' })}>
                  Plan a trip
                </Button>
              }
            />
          </ListCard>
        ) : (
          <ListCard>
            {recents.map((p) => (
              <ListRow
                key={p.id}
                icon="clock"
                title={p.name}
                subtitle={p.area}
                chevron
                onOpen={() => navigate({ name: 'routes', placeId: p.id })}
              />
            ))}
          </ListCard>
        )}
      </ListSection>

      <ListSection id={TRIPS_ID} title="Saved trips">
        {loading ? (
          <ListCard as="div">
            <ListSkeleton rows={1} />
          </ListCard>
        ) : state.savedTrips.length === 0 ? (
          <ListCard as="div">
            <EmptyState icon="route" title="No saved trips" body="Tap Save trip on a trip to keep it here." />
          </ListCard>
        ) : (
          <ListCard>
            <SavedTripRows
              trips={state.savedTrips}
              onOpen={(t) => navigate({ name: 'trip', placeId: t.placeId, optionId: t.optionId })}
            />
          </ListCard>
        )}
      </ListSection>

      <p role="status" className="sr-only">
        {announcement}
      </p>
    </Page>
  );
}
