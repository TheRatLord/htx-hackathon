// /dev/ui: every section-C component with representative props, for F0b's visual work and QA.
// Sample data mirrors the spec's examples (stop 342, route 40, Northwest Transit Center).

import { useState, type ReactNode } from "react";
import type { Alert, Dep, NearbyRoute, NearbyTransitCenter, RouteRef, StopSummary } from "../../api/types.ts";
import { usePageTitle } from "../../app/usePageTitle.ts";
import { useLang } from "../../i18n/index.ts";
import { AlertBox } from "../../ui/AlertBox.tsx";
import { AlertStatusLine } from "../../ui/AlertStatusLine.tsx";
import { AppBar } from "../../ui/AppBar.tsx";
import { BayDiagram } from "../../ui/BayDiagram.tsx";
import { BayTag } from "../../ui/BayTag.tsx";
import { BottomSheet } from "../../ui/BottomSheet.tsx";
import { Button } from "../../ui/Button.tsx";
import { ChipRow } from "../../ui/ChipRow.tsx";
import { Dialog } from "../../ui/Dialog.tsx";
import { EmptyState } from "../../ui/EmptyState.tsx";
import { ErrorState } from "../../ui/ErrorState.tsx";
import { Fab } from "../../ui/Fab.tsx";
import { FilterChip } from "../../ui/FilterChip.tsx";
import { Icon, type IconName } from "../../ui/Icon.tsx";
import { Legend } from "../../ui/Legend.tsx";
import { ListRow } from "../../ui/ListRow.tsx";
import { LiveStrip } from "../../ui/LiveStrip.tsx";
import { MapSearchBar } from "../../ui/MapSearchBar.tsx";
import { MetroMark } from "../../ui/MetroMark.tsx";
import { NearbyStopCard } from "../../ui/NearbyStopCard.tsx";
import { NotifyPermissionCard } from "../../ui/NotifyPermissionCard.tsx";
import { RouteBadge } from "../../ui/RouteBadge.tsx";
import { RouteDirectionCard } from "../../ui/RouteDirectionCard.tsx";
import { SavedStopRow } from "../../ui/SavedStopRow.tsx";
import { ScheduleCaption } from "../../ui/ScheduleCaption.tsx";
import { SearchField } from "../../ui/SearchField.tsx";
import { SectionHeader } from "../../ui/SectionHeader.tsx";
import { SegmentedControl } from "../../ui/SegmentedControl.tsx";
import { SheetBanner } from "../../ui/SheetBanner.tsx";
import { SheetHeader } from "../../ui/SheetHeader.tsx";
import { Skeleton } from "../../ui/Skeleton.tsx";
import { StatusBanner } from "../../ui/StatusBanner.tsx";
import { StatusWord } from "../../ui/StatusWord.tsx";
import { StepList } from "../../ui/StepList.tsx";
import { TimeValue } from "../../ui/TimeValue.tsx";
import { useToast } from "../../ui/Toast.tsx";
import { TransitCenterCard } from "../../ui/TransitCenterCard.tsx";
import type { Snap } from "../../ui/types.ts";
import { UpdatedAgo } from "../../ui/UpdatedAgo.tsx";
import styles from "./UiGallery.module.css";

const r40: RouteRef = { id: "040", name: "40", color: "#004080", textColor: "#FFFFFF", mode: "bus" };
const r137: RouteRef = { id: "137", name: "137", color: "#004080", textColor: "#FFFFFF", mode: "bus" };
const r58: RouteRef = { id: "058", name: "58", color: "#004080", textColor: "#FFFFFF", mode: "bus" };
const red: RouteRef = { id: "700", name: "Red", color: "#EF0000", textColor: "#FFFFFF", mode: "rail" };
const r500: RouteRef = { id: "500", name: "500", color: "#004080", textColor: "#FFFFFF", mode: "bus" };

const stop342: StopSummary = {
  id: "342",
  name: "Lamar St @ Main St",
  lat: 29.75651,
  lon: -95.36412,
  kind: "stop",
  directionLabel: "Westbound",
  side: "North side of Lamar St",
  routes: [r40, { ...r137, id: "041", name: "41" }].map(({ mode: _m, ...r }) => r),
  subtitle: "",
};
const stop246: StopSummary = {
  id: "246",
  name: "Fannin St @ McKinney St",
  lat: 29.7571,
  lon: -95.3654,
  kind: "stop",
  directionLabel: "Southbound",
  side: "West side of Fannin St",
  routes: [r137, { ...r40, id: "051", name: "51" }, { ...r40, id: "052", name: "52" }, { ...r40, id: "011", name: "11" }].map(({ mode: _m, ...r }) => r),
  subtitle: "",
};

const alert: Alert = {
  id: "demo-82-stop-moved",
  cause: "CONSTRUCTION",
  effect: "STOP_MOVED",
  severity: "WARNING",
  header: { en: "Route 82 Westheimer: eastbound stop at Westheimer Rd @ Kirby Dr moved 150 ft east" },
  description: { en: "Board at the temporary stop east of Kirby Dr until construction ends." },
  routes: [{ routeId: "082", route: "82", color: "#004080" }],
  stopIds: [],
  activeFrom: "2026-09-20T10:00:00Z",
  activeUntil: "2026-10-03T23:00:00Z",
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>{title}</h2>
      <div className={styles.body}>{children}</div>
    </section>
  );
}

const ICONS: IconName[] = [
  "map_pin", "tickets", "bus_stop", "menu", "search", "my_location", "route_plan", "warning", "error", "check_circle",
  "directions_bus", "tram", "directions_walk", "schedule", "calendar_month", "notifications", "notifications_active", "refresh",
  "chevron_right", "chevron_left", "north_east", "close", "swap_vert", "star", "star_filled", "place", "live_arcs", "expand_less",
  "expand_more", "arrow_upward", "arrow_downward", "turn_left", "turn_right", "turn_slight_left", "turn_slight_right", "straight", "flag",
];

export default function UiGallery() {
  usePageTitle("Component gallery");
  const lang = useLang();
  const toast = useToast();
  const [now] = useState(() => Date.now());
  const at = (min: number) => new Date(now + min * 60_000).toISOString();
  const dep = (min: number, extra: Partial<Dep> = {}): Dep => ({ departureTime: at(min), isRealtime: false, canceled: false, source: "schedule", tripId: `t${min}`, ...extra });
  const live = (min: number) => dep(min, { isRealtime: true, source: "gtfs-rt" });
  const nr = (route: RouteRef, directionLabel: string, headsign: string, deps: Dep[]): NearbyRoute => ({
    routeId: route.id,
    name: route.name,
    color: route.color,
    textColor: route.textColor,
    directionLabel,
    headsign,
    departures: deps.map((d) => ({ ...d, minutesAway: 0, delaySeconds: 0 })),
  });
  const tc: NearbyTransitCenter = {
    id: "northwest-transit-center",
    name: "Northwest Transit Center",
    lat: 29.7867,
    lon: -95.4556,
    distanceM: 640,
    walkDistanceM: 832,
    walkDistanceText: "0.5 mi",
    walkMin: 11,
    bayCount: 16,
    source: "hand-authored-demo",
  };

  const [chip, setChip] = useState("now");
  const [dir, setDir] = useState<"0" | "1">("0");
  const [route, setRoute] = useState("040");
  const [snap, setSnap] = useState<Snap>("half");
  const [dialog, setDialog] = useState(false);
  const [search, setSearch] = useState("hobby");
  const [bay, setBay] = useState("M");

  return (
    <div className={styles.gallery}>
      <h1 tabIndex={-1} className={styles.title}>
        Component gallery
      </h1>

      <Section title="Icon (B.3)">
        <div className={styles.wrap}>
          {ICONS.map((n) => (
            <span key={n} className={styles.icon} title={n}>
              <Icon name={n} />
              <small>{n}</small>
            </span>
          ))}
        </div>
        <MetroMark />
      </Section>

      <Section title="C.1 RouteBadge">
        <div className={styles.row}>
          <RouteBadge route={r40} size="sm" />
          <RouteBadge route={red} size="sm" />
          <RouteBadge route={r40} size="md" onPress={() => setRoute("040")} selected={route === "040"} />
          <RouteBadge route={r137} size="md" onPress={() => setRoute("137")} selected={route === "137"} />
          <RouteBadge route={red} size="md" />
          <RouteBadge route={r40} size="sm" showIcon />
          <RouteBadge route={{ ...r40, id: "082", name: "82" }} size="lg" />
        </div>
      </Section>

      <Section title="C.2 TimeValue, StatusWord, ScheduleCaption">
        <div className={styles.col}>
          <TimeValue dep={dep(16)} size="minutes" />
          <TimeValue dep={live(4)} size="minutes" />
          <TimeValue dep={dep(12, { canceled: true })} size="minutes" />
          <TimeValue dep={dep(8, { isRealtime: true, source: "simulated" })} size="minutes" />
          <TimeValue dep={dep(0.5)} size="minutes" walkMin={1} />
          <TimeValue dep={dep(70)} size="body" />
          <TimeValue dep={live(16)} size="minutes" offline />
          <span className={styles.row}>
            <StatusWord status="live" /> <StatusWord status="simulated" /> <StatusWord status="canceled" /> (scheduled renders nothing:
            <StatusWord status="scheduled" />)
          </span>
          <ScheduleCaption />
        </div>
      </Section>

      <Section title="C.3 LiveStrip">
        <div className={styles.bleed}>
          <LiveStrip deps={[dep(16), live(46), dep(62, { canceled: true }), dep(76)]} />
          <LiveStrip deps={[]} loading />
          <LiveStrip deps={[]} emptyText="No more trips today. Next bus Sat 5:12 AM" />
        </div>
      </Section>

      <Section title="C.4 Legend">
        <Legend />
      </Section>

      <Section title="C.5a NearbyStopCard">
        <NearbyStopCard
          stop={stop246}
          walkDistanceM={60}
          routes={[
            nr(r137, "Westbound", "Downtown", [dep(0.5), dep(15)]),
            nr({ ...r40, id: "051", name: "51" }, "Southbound", "Downtown TC", [live(2), dep(31)]),
            nr({ ...r40, id: "052", name: "52" }, "Southbound", "Downtown TC", [dep(16), dep(46)]),
          ]}
          onOpen={() => toast({ message: "Open stop 246" })}
          onOpenRoute={(id) => toast({ message: `Open route ${id}` })}
          onWalk={() => toast({ message: "Walk" })}
        />
        <NearbyStopCard
          stop={stop342}
          walkDistanceM={330}
          routes={[]}
          walkFrom={{ label: "from the museum", param: "29.722,-95.3897", name: "Houston Museum of Natural Science" }}
          onOpen={() => {}}
          onOpenRoute={() => {}}
          onWalk={() => {}}
        />
      </Section>

      <Section title="C.5b SavedStopRow">
        <SavedStopRow
          stopId="2958"
          name="Westheimer Rd @ Montrose Blvd"
          routes={[{ route: { ...r40, id: "082", name: "82" }, directionLabel: "Eastbound", headsign: "Downtown", deps: [dep(7), dep(15)] }]}
          onOpen={() => {}}
          moreSaved={{ count: 2, onPress: () => {} }}
        />
      </Section>

      <Section title="C.5c RouteDirectionCard">
        <RouteDirectionCard route={r40} directionLabel="Northbound" headsign="N Shepherd P&R" stop={stop342} walkDistanceM={170} deps={[dep(16), dep(46)]} onOpen={() => {}} onWalk={() => {}} />
        <RouteDirectionCard
          route={r58}
          directionLabel="Westbound"
          headsign="West Belt"
          stop={{ ...stop342, id: "79", name: "Northwest Transit Center - Platform 2" }}
          walkDistanceM={832}
          deps={[dep(24), dep(84)]}
          bay="M"
          tcName="Northwest Transit Center"
          onOpen={() => {}}
          onWalk={() => {}}
        />
      </Section>

      <Section title="C.5d TransitCenterCard, BayTag">
        <TransitCenterCard
          tc={tc}
          nextDeps={[
            { ...dep(5), bay: "D", route: { ...r40, id: "085", name: "85" }, directionLabel: "Southbound", headsign: "Downtown" },
            { ...dep(9), bay: "G", route: { ...r40, id: "085", name: "85" }, directionLabel: "Northbound", headsign: "SH 249" },
          ]}
          onOpen={() => {}}
          onWalk={() => {}}
        />
        <BayTag bay="M" />
      </Section>

      <Section title="C.6 BottomSheet, C.7 SheetHeader">
        <div className={styles.sheetBox}>
          <BottomSheet
            snap={snap}
            onSnapChange={setSnap}
            onBack={() => toast({ message: "Back" })}
            ariaLabel="Sample sheet"
            header={<SheetHeader title="Nearby stops" sub={<UpdatedAgo at={at(-0.15)} onRefresh={() => {}} compact />} />}
            footer={<Button variant="primary" fullWidth icon="notifications_active" label="▶ Start trip" onPress={() => {}} />}
          >
            <p className={styles.pad}>Sheet body ({snap}). Drag the handle or use Show list / Show map.</p>
          </BottomSheet>
        </div>
        <SheetHeader title="Lamar St @ Main St (342)" titleAlign="center" sub="On the north side of Lamar St" />
      </Section>

      <Section title="C.7 AppBar">
        <AppBar title="Route Schedules" onBack={() => {}} right={<Button variant="tonal" icon="star" label="Save" onPress={() => {}} />} />
      </Section>

      <Section title="C.8 MapSearchBar, SearchField">
        <div className={styles.mapTint}>
          <MapSearchBar onPress={() => toast({ message: "Open search" })} />
        </div>
        <SearchField value={search} onChange={setSearch} onBack={() => {}} label="Search" autoFocus={false} />
      </Section>

      <Section title="C.9 Fabs">
        <div className={`${styles.mapTint} ${styles.col}`} style={{ alignItems: "flex-end" }}>
          <Fab kind="routeAlerts" count={1} onPress={() => {}} />
          <Fab kind="locate" onPress={() => {}} />
          <Fab kind="planTrip" onPress={() => {}} />
          <Fab kind="myTrip" onPress={() => {}} />
        </div>
      </Section>

      <Section title="C.10 Button, FilterChip, ChipRow, SegmentedControl">
        <div className={styles.col}>
          <Button variant="primary" fullWidth label="Plan My Trip" onPress={() => {}} />
          <div className={styles.row}>
            <Button variant="tonal" icon="calendar_month" label="Full Schedule" onPress={() => {}} />
            <Button variant="tonal" icon="notifications" label="Track Bus Stop" pressed onPress={() => {}} />
          </div>
          <Button variant="outline" fullWidth label="Search a place or stop" onPress={() => {}} />
          <div className={styles.row}>
            <Button variant="text" label="Refresh" onPress={() => {}} />
            <Button variant="danger-text" label="End trip" onPress={() => {}} />
            <Button variant="text" external href="https://www.ridemetro.org" label="RideMETRO.org" />
          </div>
          <Button variant="primary" fullWidth label="Plan My Trip" disabled disabledReason="Choose a starting point first." />
          <div className={styles.row}>
            {["now", "15", "30", "60"].map((c) => (
              <FilterChip key={c} label={c === "now" ? "Now" : `In ${c} min`} selected={chip === c} onPress={() => setChip(c)} />
            ))}
          </div>
        </div>
        <div className={styles.bleed}>
          <ChipRow label="Your route? Tap it:" ariaLabel="Routes near you">
            {[{ ...r40, id: "006", name: "6" }, { ...r40, id: "011", name: "11" }, r40, { ...r40, id: "041", name: "41" }, { ...r40, id: "051", name: "51" }, r137, red, r500].map((r) => (
              <RouteBadge key={r.id} route={r} size="md" selected={route === r.id} onPress={() => setRoute(r.id)} />
            ))}
          </ChipRow>
        </div>
        <SegmentedControl
          ariaLabel="Direction"
          value={dir}
          onChange={setDir}
          options={[
            { value: "0", label: "Eastbound", sub: "to DOWNTOWN" },
            { value: "1", label: "Westbound", sub: "to WEST OAKS" },
          ]}
        />
      </Section>

      <Section title="C.11 AlertBox, AlertStatusLine">
        <AlertBox alert={alert} lang={lang} demo onOpen={() => {}} />
        <AlertBox alert={alert} lang={lang} compact onOpen={() => {}} />
        <AlertStatusLine scope="route" name="Route 82" alerts={[]} />
        <AlertStatusLine scope="route" name="Route 82" alerts={[alert, alert]} />
      </Section>

      <Section title="C.12 StatusBanner (overlay slot), SheetBanner">
        <div className={`${styles.mapTint} ${styles.col}`}>
          <StatusBanner item={{ kind: "offline", since: "7:42 PM" }} />
          <StatusBanner item={{ kind: "trip-active", arriveAt: "7:49 PM", onOpen: () => {} }} />
          <StatusBanner item={{ kind: "search-this-area", onPress: () => {} }} />
          <StatusBanner item={{ kind: "downtown-fallback" }} />
          <StatusBanner item={{ kind: "demo-location" }} />
        </div>
        <SheetBanner kind="trip-planned" place="Hobby Airport" leaveAt="6:59 PM" onOpen={() => {}} onClear={() => {}} />
        <SheetBanner kind="location-off" reason="denied" onTurnOn={() => {}} onSearch={() => {}} />
        <SheetBanner kind="demo" text="Demo data: live times are simulated" />
      </Section>

      <Section title="C.13 StepList">
        <StepList
          currentIndex={1}
          onStepPress={(s) => toast({ message: s.title })}
          steps={[
            { kind: "walk", title: "My current location", lines: ["Walk 6 min · 0.3 mi to M L King Blvd @ UH University Dr (#11424)"], time: "6:59 PM", duration: "6 min" },
            { kind: "board", title: "BOARD to MLK & PARK VILLAGE", lines: ["7:05 PM · 26 stops"], route: { ...r40, id: "080", name: "80" }, time: "7:05 PM", status: "live" },
            { kind: "alight", title: "Get off at M L King Blvd @ Bellfort (#3938)", lines: [], route: { ...r40, id: "080", name: "80" }, time: "7:25 PM" },
            { kind: "arrive", title: "Hobby Airport", lines: [], time: "7:49 PM" },
          ]}
        />
      </Section>

      <Section title="C.14 BayDiagram">
        <BayDiagram
          handAuthored
          highlight={bay}
          onBayPress={setBay}
          platforms={[
            { stopId: "13170", label: "Platform 1 · Stop #13170", bays: ["C", "D", "E", "G", "H", "I"] },
            { stopId: "79", label: "Platform 2 · Stop #79", bays: ["K", "L", "M", "N", "O", "P", "Q", "R", "S", "T"], routesByBay: { M: ["58"] } },
          ]}
        />
      </Section>

      <Section title="C.15 Dialog, Toast, EmptyState, ErrorState, Skeleton, UpdatedAgo, NotifyPermissionCard, ListRow, SectionHeader">
        <div className={styles.row}>
          <Button variant="tonal" label="Open dialog" onPress={() => setDialog(true)} />
          <Button variant="tonal" label="Show undo toast" onPress={() => toast({ message: "Removed from saved.", action: { label: "Undo", onPress: () => {} } })} />
        </div>
        <Dialog
          open={dialog}
          onClose={() => setDialog(false)}
          title="End this trip?"
          body="You can start it again from Plan Your Trip."
          actions={[
            { label: "Keep going", variant: "text", onPress: () => setDialog(false) },
            { label: "End trip", variant: "danger-text", onPress: () => setDialog(false) },
          ]}
        />
        <EmptyState icon="bus_stop" title="Nothing here yet" body="Stops and routes you look at will appear here." action={{ label: "Search", onPress: () => {} }} />
        <ErrorState error={new Error("boom")} onRetry={() => {}} />
        <Skeleton variant="stop-card" />
        <Skeleton variant="row" />
        <Skeleton variant="strip" />
        <div className={styles.col}>
          <UpdatedAgo at={at(-0.15)} onRefresh={() => {}} />
          <UpdatedAgo at={at(-3)} onRefresh={() => {}} />
          <UpdatedAgo at={at(-20)} onRefresh={() => {}} offline />
        </div>
        <NotifyPermissionCard context="trip" onDone={() => {}} />
        <div className={styles.bleed}>
          <SectionHeader label="Rider resources" tone="blue" />
          <ListRow kind="internal" label="Route Schedules" onPress={() => {}} />
          <ListRow kind="external" label="RideMETRO.org" href="https://www.ridemetro.org" />
          <ListRow kind="internal" label="Language" value="English" onPress={() => {}} />
          <ListRow kind="radio" label="Español" checked onPress={() => {}} />
          <ListRow kind="toggle" label="Notifications" checked={false} onPress={() => {}} />
          <ListRow kind="radio" label="Tiếng Việt" sub="Coming soon" disabled />
          <SectionHeader label="Saved stops" tone="variant" action={{ label: "Edit", onPress: () => {} }} note="To be confirmed by METRO" />
        </div>
      </Section>
    </div>
  );
}
