import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useRouter } from '../../app/router';
import { useSimulatedLoading } from '../../app/hooks';
import { BottomSheet } from '../../components/BottomSheet';
import { Icon } from '../../components/Icon';
import { Button, ConceptLabel, EmptyState, IconButton, Overline, RouteBadge, Skeleton, StatusTag } from '../../components/ui';
import { USER_POSITION } from '../../data/geography';
import { SAMPLE_NOW, getStop } from '../../data/sampleData';
import type { StopRoute, TimeStatus } from '../../data/types';
import { STATUS_DESCRIPTION, formatClock, formatCountdown, formatHour, formatMinuteList } from '../../lib/format';
import { nearbyStops } from '../../lib/trips';
import { useMapScene, type MapScene } from '../../map/scene';
import './StopScreen.css';

const SHEET_SNAPS = [0.62, 0.92];
/** How long the pretend "sending" of a problem report takes. */
const REPORT_SENDING_MS = 900;
const PANEL_ID = 'stop-panel';
/**
 * Degrees of latitude to keep clear below the stop when fitting the map, so
 * the pin's "4 min" caption isn't hidden under the sheet.
 */
const CAPTION_ROOM = 0.0005;

type ReportState = 'sending' | 'sent';

const routeKey = (r: StopRoute) => `${r.lineId}-${r.direction}`;
const tabId = (key: string) => `stop-tab-${key}`;

export function StopScreen({ stopId }: { stopId: string }) {
  const { navigate, back } = useRouter();
  const stop = getStop(stopId);
  const nearby = useMemo(() => nearbyStops(), []);
  const walk = nearby.find((s) => s.stop.id === stopId)?.walkMinutes;
  const [sheetIndex, setSheetIndex] = useState(0);
  const loading = useSimulatedLoading(`stop-${stopId}`);

  const routes = stop?.routes ?? [];
  const [selectedKey, setSelectedKey] = useState(() => (routes[0] ? routeKey(routes[0]) : ''));
  const selected = routes.find((r) => routeKey(r) === selectedKey) ?? routes[0];

  // Report state is kept per route tab while the rider stays on this screen.
  const [reports, setReports] = useState<Record<string, ReportState>>({});
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const report = (key: string) => {
    setReports((r) => ({ ...r, [key]: 'sending' }));
    const t = window.setTimeout(() => setReports((r) => ({ ...r, [key]: 'sent' })), REPORT_SENDING_MS);
    timers.current.push(t);
  };

  const scene = useMemo<MapScene>(
    () => ({
      stops: nearby.map((s) => ({
        id: s.stop.id,
        position: s.stop.position,
        label: String(s.rank),
        caption: `${s.walkMinutes} min`,
        active: s.stop.id === stopId,
      })),
      fit: stop
        ? [USER_POSITION, stop.position, [stop.position[0], stop.position[1] - CAPTION_ROOM]]
        : [USER_POSITION, ...nearby.map((s) => s.stop.position)],
      fitKey: `stop-${stopId}`,
      paddingTop: 16,
      controlsTop: 16,
      onStopClick: (id) => {
        // Replace, so Back from the new stop still goes home.
        if (id !== stopId) navigate({ name: 'stop', stopId: id }, { replace: true });
      },
    }),
    [nearby, stop, stopId, navigate],
  );
  useMapScene(scene);

  const goBack = () => back({ name: 'home', sheet: 'half' });

  if (!stop) {
    return (
      <div className="map-overlay stop">
        <BottomSheet label="Stop not found" snapPoints={[400]}>
          <EmptyState
            icon="pin"
            title="We can't find this stop"
            body="It isn't in the sample data. Pick one of the stops near you instead."
            action={
              <Button icon="home" onClick={() => navigate({ name: 'home', sheet: 'half' }, { replace: true })}>
                Back to Home
              </Button>
            }
          />
          <ConceptLabel className="stop__concept stop__concept--center" />
        </BottomSheet>
      </div>
    );
  }

  const routeCount = `${routes.length} ${routes.length === 1 ? 'route' : 'routes'}`;
  const header = (
    <div className="stop-head">
      <IconButton icon="chevron-left" label="Back" className="stop-head__back" onClick={goBack} />
      <div className="stop-head__text">
        <h1 className="t-title-sm stop-head__title">{stop.name}</h1>
        <p className="t-small t-muted stop-head__meta">
          {walk !== undefined && (
            <>
              <Icon name="walk" size={16} />
              <span>{walk} min walk</span>
              <span aria-hidden="true">·</span>
            </>
          )}
          <span>{routeCount}</span>
        </p>
      </div>
    </div>
  );

  return (
    <div className="map-overlay stop">
      <BottomSheet
        label={`${stop.name} schedule`}
        snapPoints={SHEET_SNAPS}
        index={sheetIndex}
        onIndexChange={setSheetIndex}
        header={header}
      >
        {routes.length === 0 || !selected ? (
          <EmptyState icon="bus" title="No routes stop here today" body="Check another stop near you." />
        ) : (
          <>
            <RouteTabs routes={routes} selectedKey={routeKey(selected)} onSelect={setSelectedKey} />
            <div
              id={PANEL_ID}
              role="tabpanel"
              aria-labelledby={tabId(routeKey(selected))}
              className="stop-panel"
            >
              <div key={routeKey(selected)} className="stop-panel__inner">
                <RoutePanel
                  route={selected}
                  loading={loading}
                  reportState={reports[routeKey(selected)]}
                  onReport={() => report(routeKey(selected))}
                />
              </div>
            </div>
          </>
        )}
        <ConceptLabel className="stop__concept" />
      </BottomSheet>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function RouteTabs({
  routes,
  selectedKey,
  onSelect,
}: {
  routes: StopRoute[];
  selectedKey: string;
  onSelect: (key: string) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = Math.max(
    0,
    routes.findIndex((r) => routeKey(r) === selectedKey),
  );

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const last = routes.length - 1;
    let next: number | undefined;
    if (e.key === 'ArrowRight') next = current === last ? 0 : current + 1;
    else if (e.key === 'ArrowLeft') next = current === 0 ? last : current - 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = last;
    if (next === undefined) return;
    e.preventDefault();
    onSelect(routeKey(routes[next]));
    refs.current[next]?.focus();
  };

  return (
    <div className="stop-tabs" role="tablist" aria-label="Routes at this stop" onKeyDown={onKeyDown}>
      {routes.map((r, i) => {
        const key = routeKey(r);
        const on = key === selectedKey;
        return (
          <button
            key={key}
            ref={(el) => {
              refs.current[i] = el;
            }}
            id={tabId(key)}
            type="button"
            role="tab"
            aria-selected={on}
            aria-controls={PANEL_ID}
            tabIndex={on ? 0 : -1}
            aria-label={`Route ${r.lineId} ${r.direction}${r.tracking.status === 'lost' ? ', tracking lost' : ''}`}
            className={`stop-tab${on ? ' stop-tab--on' : ''}`}
            onClick={() => onSelect(key)}
          >
            <RouteBadge lineId={r.lineId} />
            <span className="stop-tab__dir">{r.direction}</span>
            {r.tracking.status === 'lost' && (
              <span className="stop-tab__alert" title="Tracking lost" aria-hidden="true">
                <Icon name="alert" size={16} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function RoutePanel({
  route,
  loading,
  reportState,
  onReport,
}: {
  route: StopRoute;
  loading: boolean;
  reportState?: ReportState;
  onReport: () => void;
}) {
  const lost = route.tracking.status === 'lost' ? route.tracking : undefined;
  const nowHour = Math.floor(SAMPLE_NOW / 60);
  const nowMinute = SAMPLE_NOW % 60;

  return (
    <>
      <h2 className="stop-route-title">
        {route.lineId} {route.direction} to {route.headsign}
      </h2>

      {lost && (
        <div className="stop-lost">
          <div className="stop-lost__msg">
            <Icon name="alert" size={22} className="stop-lost__icon" />
            <p>
              Tracking lost {lost.lostMinutesAgo} min ago. These times come from the timetable, so the bus may be
              early or late.
            </p>
          </div>
          {reportState !== 'sent' && (
            <button
              type="button"
              className={`stop-lost__report${reportState === 'sending' ? ' stop-lost__report--sending' : ''}`}
              onClick={onReport}
              disabled={reportState === 'sending'}
              aria-busy={reportState === 'sending'}
            >
              <span className="stop-lost__progress" aria-hidden="true" />
              <Icon name="flag" size={20} />
              <span>{reportState === 'sending' ? 'Sending…' : 'Report a problem'}</span>
            </button>
          )}
          <div role="status" aria-live="polite" className="stop-lost__status">
            {reportState === 'sending' && <span className="sr-only">Sending report</span>}
            {reportState === 'sent' && (
              <p className="stop-lost__done">
                <span className="stop-lost__check">
                  <Icon name="check" size={18} />
                </span>
                Reported. Thank you.
              </p>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="stop-strip stop-strip--loading" aria-busy="true" aria-label="Loading departures">
          {[0, 1, 2].map((i) => (
            <span key={i} className="stop-strip__ghost" />
          ))}
        </div>
      ) : route.upcoming.length === 0 ? (
        <EmptyState icon="clock" title="No more buses today" body="The timetable below shows tomorrow's first trips." />
      ) : (
        <ol className="stop-strip" aria-label="Next departures">
          {route.upcoming.slice(0, 3).map((a) => {
            // Without GPS, no time can be Live: every tag says Scheduled.
            const status: TimeStatus = lost ? 'scheduled' : a.status;
            return (
              <li key={a.inMinutes} className="stop-strip__item">
                <span className="stop-strip__time tabular">{formatCountdown(a.inMinutes)}</span>
                <span className="stop-strip__clock tabular">{formatClock(SAMPLE_NOW + a.inMinutes)}</span>
                <StatusTag status={status} variant="on-accent" />
              </li>
            );
          })}
        </ol>
      )}

      <ul className="stop-legend" aria-label="What the labels mean">
        <li>
          <span className="stop-legend__key stop-legend__key--live">
            <span className="stop-legend__dot" aria-hidden="true" />
            LIVE
          </span>
          <span>= tracked by GPS, refreshed every 30 sec.</span>
        </li>
        <li>
          <span className="stop-legend__key stop-legend__key--scheduled">
            <span className="stop-legend__dot" aria-hidden="true" />
            SCHEDULED
          </span>
          <span>= from the timetable, bus not tracked.</span>
        </li>
      </ul>

      <Overline>Timetable · Today</Overline>
      {loading ? (
        <div className="stop-timetable-loading">
          <Skeleton lines={4} />
        </div>
      ) : route.timetable.length === 0 ? (
        <EmptyState icon="clock" title="No timetable for today" />
      ) : (
        <table className="stop-timetable">
          <caption className="sr-only">
            Route {route.lineId} {route.direction} departures today, by hour. {STATUS_DESCRIPTION.scheduled}.
          </caption>
          <tbody>
            {route.timetable.map((row) => {
              const isNow = row.hour === nowHour;
              const isPastHour = row.hour < nowHour;
              return (
                <tr
                  key={row.hour}
                  className={`stop-timetable__row${isNow ? ' stop-timetable__row--now' : ''}${
                    isPastHour ? ' stop-timetable__row--past' : ''
                  }`}
                  aria-current={isNow ? 'time' : undefined}
                >
                  <th scope="row" className="stop-timetable__hour">
                    {formatHour(row.hour)}
                  </th>
                  <td className="stop-timetable__mins tabular">
                    {row.minutes.map((m, i) => {
                      const past = isPastHour || (isNow && m < nowMinute);
                      return (
                        <span key={m}>
                          {i > 0 && <span className="stop-timetable__sep"> · </span>}
                          <span className={past ? 'stop-timetable__min--past' : undefined}>
                            {formatMinuteList([m])}
                            {past && <span className="sr-only"> (departed)</span>}
                          </span>
                        </span>
                      );
                    })}
                  </td>
                  <td className="stop-timetable__tag">{isNow && <span className="stop-timetable__now">Now</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
