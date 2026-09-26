import { useMemo, useState, type CSSProperties } from 'react';
import { useRouter } from '../../app/router';
import { useStore } from '../../app/store';
import { useSimulatedLoading } from '../../app/hooks';
import { BottomSheet } from '../../components/BottomSheet';
import { Icon } from '../../components/Icon';
import { Button, ConceptLabel, EmptyState, IconButton, RouteBadge, Skeleton, StatusTag } from '../../components/ui';
import { USER_POSITION } from '../../data/geography';
import { SAMPLE_NOW, getPlace } from '../../data/sampleData';
import type { Leg, Place, RouteOption, RouteOptionId } from '../../data/types';
import { formatClock, formatCountdown } from '../../lib/format';
import { pointAlong } from '../../lib/geo';
import { getOption, optionPath, optionSummary, totalMinutes } from '../../lib/trips';
import { useMapScene, type MapScene, type SceneRoutePath } from '../../map/scene';
import './TripScreen.css';

/**
 * Overview (header and buttons only, the whole route in view), steps, full.
 * The overview stays low so the camera can show the route's far end.
 */
const OVERVIEW_PX = 212;
const SHEET_SNAPS = [OVERVIEW_PX, 0.44, 0.92];
const STEPS_INDEX = 1;
/** Room under the steps for the sticky Save / Start footer. */
const FOOTER_SPACE = 96;

type RideLeg = Extract<Leg, { kind: 'ride' }>;

const optionColor = (id: RouteOptionId) => `var(--route-${id.toLowerCase()})`;
const tripId = (placeId: string, optionId: string) => `trip-${placeId}-${optionId}`;

/** "in 9 min", or "now" when the bus is due. */
function fromNow(at: number): string {
  const mins = at - SAMPLE_NOW;
  return mins <= 0 ? 'now' : `in ${formatCountdown(mins)}`;
}

export function TripScreen({ placeId, optionId }: { placeId: string; optionId: string }) {
  const { navigate, back } = useRouter();
  const { state, dispatch } = useStore();
  const option = useMemo(() => getOption(placeId, optionId), [placeId, optionId]);
  const place = getPlace(placeId);
  const loading = useSimulatedLoading(tripId(placeId, optionId));
  const [sheetIndex, setSheetIndex] = useState(STEPS_INDEX);
  const overview = sheetIndex === 0;
  const [announcement, setAnnouncement] = useState('');

  const scene = useMemo<MapScene>(() => {
    if (!option || !place) return { paddingTop: 64, controlsTop: 16 };
    const paths: SceneRoutePath[] = option.legs.flatMap((l) =>
      l.kind === 'wait' ? [] : [{ kind: l.kind, coords: l.path }],
    );
    const firstRide = option.legs.find((l): l is RideLeg => l.kind === 'ride');
    return {
      routes: [
        {
          id: option.id,
          color: optionColor(option.id),
          paths,
          badge: firstRide ? { label: option.id, position: pointAlong(firstRide.path, 0.5) } : undefined,
          selected: true,
        },
      ],
      destination: { position: place.position, label: place.name },
      fit: [USER_POSITION, ...optionPath(option)],
      // Refit when the sheet drops to the overview or rises again.
      fitKey: `${tripId(placeId, option.id)}-${overview ? 'overview' : 'steps'}`,
      // Clear of the round back button in the top-left corner.
      paddingTop: 64,
      controlsTop: 16,
    };
  }, [option, place, placeId, overview]);
  useMapScene(scene);

  const goBack = () => back({ name: 'routes', placeId });

  const backButton = (
    <IconButton icon="chevron-left" label="Back to route options" className="trip__back" onClick={goBack} />
  );

  if (!option || !place) {
    return (
      <div className="map-overlay trip">
        {backButton}
        <BottomSheet label="Trip not found" snapPoints={[400]}>
          <EmptyState
            icon="route"
            title="We can't find this trip"
            body="It isn't in the sample data any more. Plan it again from Home."
            action={
              <Button icon="home" onClick={() => navigate({ name: 'home' }, { replace: true })}>
                Back to Home
              </Button>
            }
          />
          <ConceptLabel className="trip__concept trip__concept--center" />
        </BottomSheet>
      </div>
    );
  }

  const saved = state.savedTrips.find((t) => t.placeId === placeId && t.optionId === option.id);
  const inProgress = state.activeTrip?.placeId === placeId && state.activeTrip.optionId === option.id;
  const total = totalMinutes(option);

  const toggleSave = () => {
    if (saved) {
      dispatch({ type: 'removeTrip', id: saved.id });
      setAnnouncement('Trip removed from saved trips');
    } else {
      dispatch({
        type: 'saveTrip',
        trip: {
          id: tripId(placeId, option.id),
          placeId,
          optionId: option.id,
          summary: optionSummary(option),
          savedAt: Date.now(),
        },
      });
      setAnnouncement('Trip saved. Find it on Home under Saved trips.');
    }
  };

  const startTrip = () => {
    dispatch({ type: 'startTrip', placeId, optionId: option.id });
    setAnnouncement('Trip started. Your first step is highlighted.');
  };

  const endTrip = () => {
    dispatch({ type: 'endTrip' });
    navigate({ name: 'home' });
  };

  const header = (
    <div className="trip-head">
      {inProgress && (
        <p className="trip-head__live">
          <span className="trip-head__live-dot" aria-hidden="true" />
          Trip in progress
        </p>
      )}
      <div className="trip-head__row">
        <span
          className="trip-head__letter"
          style={{ ['--opt' as string]: optionColor(option.id) }}
          aria-label={`Route ${option.id}`}
          role="img"
        >
          <span aria-hidden="true">{option.id}</span>
        </span>
        <h1 className="t-title trip-head__title tabular">Arrive {formatClock(option.arriveAt)}</h1>
        <p className="trip-head__total tabular">
          <span className="sr-only">Total </span>
          {total} min
        </p>
      </div>
      <p className="t-small t-muted trip-head__sub">
        To {place.name} · Leave by <span className="tabular">{formatClock(option.leaveBy)}</span>
      </p>
    </div>
  );

  const footer = (
    <div className="trip-foot">
      <Button
        variant="secondary"
        size="lg"
        icon="star"
        iconFilled={!!saved}
        aria-pressed={!!saved}
        className={`trip-foot__save${saved ? ' trip-foot__save--on' : ''}`}
        onClick={toggleSave}
      >
        {saved ? 'Saved' : 'Save trip'}
      </Button>
      {inProgress ? (
        <Button size="lg" className="trip-foot__main" onClick={endTrip}>
          End trip
        </Button>
      ) : (
        <Button size="lg" className="trip-foot__main" onClick={startTrip}>
          Start trip
        </Button>
      )}
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );

  return (
    <div className="map-overlay trip">
      {backButton}
      <BottomSheet
        label={`Trip to ${place.name}`}
        snapPoints={SHEET_SNAPS}
        index={sheetIndex}
        onIndexChange={setSheetIndex}
        header={header}
        footer={footer}
        bottomPadding={FOOTER_SPACE}
        hideBodyAtFirstSnap
      >
        <h2 className="sr-only">Steps</h2>
        {loading ? <StepsSkeleton count={option.legs.length + 1} /> : <Steps option={option} place={place} inProgress={inProgress} />}
        <ConceptLabel className="trip__concept" />
      </BottomSheet>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Steps({ option, place, inProgress }: { option: RouteOption; place: Place; inProgress: boolean }) {
  const color = optionColor(option.id);
  return (
    <ol className="trip-steps" style={{ ['--opt' as string]: color }}>
      {option.legs.map((leg, i) => {
        const current = inProgress && i === 0;
        const next = option.legs.slice(i + 1).find((l): l is RideLeg => l.kind === 'ride');
        return (
          <li
            key={i}
            className={`trip-step trip-step--${leg.kind}${current ? ' trip-step--current' : ''}`}
            style={{ ['--i' as string]: i } as CSSProperties}
            aria-current={current ? 'step' : undefined}
          >
            <span className="trip-step__rail" aria-hidden="true">
              <StepNode leg={leg} />
            </span>
            <div className="trip-step__body">
              {current && <span className="trip-step__now">Now</span>}
              <StepContent leg={leg} nextRide={next} />
            </div>
          </li>
        );
      })}
      <li className="trip-step trip-step--arrive" style={{ ['--i' as string]: option.legs.length } as CSSProperties}>
        <span className="trip-step__rail" aria-hidden="true">
          <span className="trip-node trip-node--arrive">
            <span className="trip-node__dot" />
          </span>
        </span>
        <div className="trip-step__body">
          <p className="trip-step__title">Arrive at {place.name}</p>
          <p className="trip-step__line tabular">{formatClock(option.arriveAt)}</p>
        </div>
      </li>
    </ol>
  );
}

function StepNode({ leg }: { leg: Leg }) {
  if (leg.kind === 'ride') return <RouteBadge lineId={leg.lineId} size="lg" />;
  return (
    <span className={`trip-node trip-node--${leg.kind}`}>
      <Icon name={leg.kind === 'walk' ? 'walk' : 'transfer'} size={20} />
    </span>
  );
}

function StepContent({ leg, nextRide }: { leg: Leg; nextRide?: RideLeg }) {
  switch (leg.kind) {
    case 'walk':
      return (
        <>
          <p className="trip-step__title">Walk {leg.minutes} min</p>
          <p className="trip-step__line">to {leg.to}</p>
        </>
      );
    case 'wait':
      return (
        <>
          <p className="trip-step__title">{nextRide ? `Transfer to the ${nextRide.lineId}` : 'Transfer'}</p>
          <p className="trip-step__line">
            Wait {leg.minutes} min at {leg.at}
          </p>
        </>
      );
    case 'ride':
      return (
        <>
          <p className="trip-step__title">
            Board the {leg.lineId} {leg.direction}
          </p>
          <p className="trip-step__when">
            <span className="tabular">
              Leaves {formatClock(leg.departAt)} · {fromNow(leg.departAt)}
            </span>
            <StatusTag status={leg.status} variant="pill" />
          </p>
          <p className="trip-step__line">
            Ride {leg.rideMinutes} min · get off at {leg.alight}
          </p>
          {leg.status === 'lost' && (
            <p className="trip-step__lost">
              <Icon name="alert" size={18} className="trip-step__lost-icon" />
              <span>Tracking lost. Scheduled time shown; the bus may be early or late.</span>
            </p>
          )}
        </>
      );
  }
}

function StepsSkeleton({ count }: { count: number }) {
  return (
    <div className="trip-steps trip-steps--loading" aria-busy="true" aria-label="Loading trip steps">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="trip-step trip-step--ghost">
          <span className="trip-step__rail" aria-hidden="true">
            <span className="trip-node trip-node--ghost" />
          </span>
          <div className="trip-step__body">
            <Skeleton lines={2} />
          </div>
        </div>
      ))}
    </div>
  );
}
