// Props of every section-C component (spec C). Screens compose these components and
// never restyle them; a needed variant is requested in docs/design/requests.md.

import type { ReactNode, Ref } from "react";
import type { ApiError } from "../api/client.ts";
import type { Alert, Dep, NearbyRoute, NearbyStop, NearbyTransitCenter, RouteRef, Status, StopSummary } from "../api/types.ts";
import type { Lang, Vars } from "../i18n/index.ts";
import type { NotifyContext } from "../state/notifyAsked.ts";
import type { IconName } from "./Icon.tsx";

export type Snap = "peek" | "half" | "full";

/** C.1 */
export interface RouteBadgeProps {
  route: RouteRef;
  size: "xs" | "sm" | "md" | "lg";
  selected?: boolean;
  showIcon?: boolean;
  onPress?: () => void;
  ariaLabel?: string;
}

/** C.2 */
export interface TimeValueProps {
  dep: Dep;
  size: "minutes" | "strip" | "body";
  walkMin?: number;
}

export interface StatusWordProps {
  status: Status;
}

/** C.3 */
export interface LiveStripProps {
  deps: Dep[];
  loading?: boolean;
  emptyText?: string;
  /**
   * The next scheduled trip when none is in the window (from /stops/:id/schedule's
   * `nextServiceFirst`; `today` when its serviceDate is the response's serviceDate). Shown as a
   * big clock time with "First bus · in 3 hr 17 min", instead of `emptyText`.
   */
  nextService?: { departureTime: string; today: boolean };
  /** One line inside the strip, under the times, in white at 88% (like the late-night caption): "First time: your 80, scheduled 12:10 PM". */
  caption?: string;
}

/** One fact on the strip in its digits, e.g. "about **7** min" (D13's ride step). */
export interface StripFact {
  lead?: string;
  value: string | number;
  unit: string;
}

/** C.5a */
export interface NearbyStopCardProps {
  stop: StopSummary;
  walkDistanceM?: number;
  routes: NearbyRoute[];
  /** NearbyStop.laterFirst: a route with nothing in the window shows its next bus, with its direction ("First bus 5:10 AM · in 3 hr"). */
  laterFirst?: NearbyStop["laterFirst"];
  maxRoutes?: 3;
  /** D4: walk times are measured from a place. `label` is the short form ("from the museum"), `name` the full name. */
  walkFrom?: { label: string; param: string; name?: string };
  onOpen: () => void;
  onOpenRoute: (routeId: string) => void;
  onWalk: () => void;
  /** The first route row, for screens that size the sheet to show it (D2 fold rule M2). */
  firstRowRef?: Ref<HTMLLIElement>;
}

export interface WalkButtonProps {
  stopId: string;
  /** Set when the target is a transit center: the label names it instead of a stop id. */
  tcName?: string;
  walkDistanceM: number;
  walkFrom?: { label: string; name?: string };
  onPress: () => void;
}

/** C.5b */
export interface SavedStopRoute {
  route: RouteRef;
  directionLabel: string;
  headsign: string;
  deps: Dep[];
}

export interface SavedStopRowProps {
  stopId: string;
  name: string;
  preferredRouteId?: string;
  routes: SavedStopRoute[];
  onOpen: () => void;
  /** "+2 saved ›" at the top right when more stops are saved (D2 item 5). */
  moreSaved?: { count: number; onPress: () => void };
  /** The side-of-street line and walk pill, as on a nearby card (C.5a), when the rider's position is known. */
  side?: string;
  walkDistanceM?: number;
  onWalk?: () => void;
}

/** C.5c */
export interface RouteDirectionCardProps {
  route: RouteRef;
  directionLabel: string;
  headsign: string;
  stop: StopSummary;
  walkDistanceM?: number;
  deps: Dep[];
  bay?: string;
  tcName?: string;
  /** Shown in place of the times once they have loaded and none is upcoming ("No buses in the next 2 hours"). */
  noServiceText?: string;
  onOpen: () => void;
  onWalk: () => void;
}

/** C.5d */
export type TcDeparture = Dep & { bay?: string; route: RouteRef; directionLabel: string; headsign: string };

export interface TransitCenterCardProps {
  tc: NearbyTransitCenter;
  nextDeps: TcDeparture[];
  onOpen: () => void;
  onWalk: () => void;
}

export interface BayTagProps {
  bay: string;
}

/** C.6 */
export interface BottomSheetProps {
  snap: Snap;
  onSnapChange: (s: Snap) => void;
  minHalf?: number;
  onBack?: () => void;
  header: ReactNode;
  peek?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  allowPeek?: boolean;
  /** Nothing below the fold to show (location off, no saved stop): no "Show list" chevron. "Show map" stays. */
  noList?: boolean;
  ariaLabel: string;
}

/** C.7 */
export interface SheetHeaderProps {
  title: string;
  /** Small grey line above the title, part of the heading: "Stops near" over a place name, so the name alone gets the title line. */
  overline?: string;
  titleAlign?: "start" | "center";
  /** "stop" is the 20sp Bold stop title (the default when centred); "title" the 22sp Regular sheet title. */
  titleSize?: "title" | "stop";
  sub?: ReactNode;
  right?: ReactNode;
}

export interface AppBarProps {
  title: string;
  onBack: () => void;
  right?: ReactNode;
}

/** C.8 */
export interface MapSearchBarProps {
  onPress: () => void;
}

export interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  onBack: () => void;
  onSubmit?: () => void;
  label: string;
  placeholder?: string;
  autoFocus?: boolean;
}

/** C.9 */
export type FabProps =
  | { kind: "locate"; onPress: () => void }
  | { kind: "planTrip"; onPress: () => void }
  | { kind: "routeAlerts"; count: number; onPress: () => void }
  | { kind: "myTrip"; onPress: () => void };

/** C.10 */
export type ButtonVariant = "primary" | "tonal" | "outline" | "text" | "danger-text";

export interface ButtonProps {
  variant: ButtonVariant;
  label: string;
  icon?: IconName;
  onPress?: () => void;
  disabled?: boolean;
  disabledReason?: string;
  fullWidth?: boolean;
  href?: string;
  external?: boolean;
  /** What `external` adds to the accessible name; default "(opens RideMETRO.org)". */
  externalLabel?: string;
  /** Toggle buttons (Save, Track Bus Stop). */
  pressed?: boolean;
  ariaLabel?: string;
}

export interface FilterChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export interface ChipRowProps {
  children: ReactNode;
  label?: string;
  ariaLabel: string;
  /** Draw `label` as the scroller's first item, on the chips' row ("Your route: [6] [11] …"). */
  inlineLabel?: boolean;
  /** Wrap onto more rows instead of scrolling behind "More ›" (a few chips that must all show: plan sort). */
  wrap?: boolean;
}

export interface SegmentedOption<V extends string> {
  value: V;
  label: string;
  sub?: string;
  /** The label drawn at 18 or 21sp, as a sample of what it picks (D1's A / A+ / A++). */
  labelSize?: "large" | "xlarge";
}

export interface SegmentedControlProps<V extends string> {
  options: SegmentedOption<V>[];
  value: V;
  onChange: (value: V) => void;
  ariaLabel: string;
}

/** C.11 */
export interface AlertBoxProps {
  alert: Alert;
  lang: Lang;
  /** true drops the description and dates; "list" (D14) drops only the description. */
  compact?: boolean | "list";
  demo?: boolean;
  /** Badges before the effect word (D14); past 6 the rest read "+N". */
  routes?: RouteRef[];
  onOpen: () => void;
}

export interface AlertStatusLineProps {
  scope: "route" | "stop" | "trip";
  /** "Route 82", a stop name or "this trip": used in "No alerts for …". */
  name: string;
  alerts: Alert[];
  /** Demo alerts and none for this: say "Demo alerts only" (Alerts screens) instead of nothing. */
  demoNote?: boolean;
}

/** C.12 map overlay slot (StatusBanner), in priority order. */
export type OverlayItem =
  | { kind: "offline"; since?: string }
  | { kind: "trip-active"; arriveAt: string; onOpen?: () => void; complete?: boolean }
  | { kind: "search-this-area"; onPress: () => void }
  | { kind: "downtown-fallback" }
  | { kind: "demo-location" };

/** C.12 sheet banner row. */
export type SheetBannerProps =
  | { kind: "trip-planned"; place: string; leaveAt: string; onOpen: () => void; onClear: () => void }
  /** `compact`: one row, "Location is off · Turn on", for when a saved stop is shown above it. */
  | { kind: "location-off"; reason: "denied" | "unavailable"; blocked?: boolean; compact?: boolean; onTurnOn: () => void; onSearch: () => void }
  | { kind: "demo"; text: string };

/** C.13 */
export interface TimelineStep {
  kind: "walk" | "board" | "ride" | "alight" | "transfer" | "arrive";
  /** Before the route badge: "BOARD [80] to MLK & PARK VILLAGE". */
  titleLead?: string;
  title: string;
  lines: string[];
  time?: string;
  status?: Status;
  route?: RouteRef;
  stopId?: string;
  /** An alert row (warning icon, alert colours); it opens the alert. Use kind "ride" inside a ride. */
  alert?: Alert;
  /** The alert row comes from demo data: it carries the Demo tag. */
  demo?: boolean;
  /** The leg's line colour on a row without a badge (get off, alert rows); defaults to `route.color`. */
  legColor?: string;
  /** Duration badge ("6 min"). */
  duration?: string;
}

export interface StepListProps {
  steps: TimelineStep[];
  onStepPress: (step: TimelineStep, index: number) => void;
  /** D13 "All steps": marks the current step "You are here". */
  currentIndex?: number;
}

/** C.14 */
export interface BayDiagramProps {
  /** `label` is the visible "PLATFORM 2 · STOP #79"; `spokenName` ("Platform 2") goes in each tile's label. */
  platforms: { stopId: string; label: string; spokenName?: string; bays: string[]; routesByBay?: Record<string, string[]> }[];
  /** Every bay the selected route leaves from. */
  highlight?: { stopId: string; bay: string }[];
  onBayPress: (bay: string) => void;
  handAuthored?: boolean;
}

/** C.15 */
export interface DialogAction {
  label: string;
  variant: "text" | "danger-text";
  onPress: () => void;
}

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  body: ReactNode;
  actions: DialogAction[];
}

export interface ToastOptions {
  message: string;
  action?: { label: string; onPress: () => void };
  durationMs?: number;
}

export interface EmptyStateProps {
  icon: IconName;
  title: string;
  body: string;
  action?: { label: string; onPress: () => void; variant?: "primary" | "tonal" };
}

export interface ErrorStateProps {
  error: ApiError | Error;
  context?: Vars;
  onRetry: () => void;
}

export interface SkeletonProps {
  variant: "stop-card" | "row" | "strip";
}

export interface UpdatedAgoProps {
  at: string;
  onRefresh: () => void;
  compact?: boolean;
}

export interface NotifyPermissionCardProps {
  context: NotifyContext;
  onDone?: (result: "granted" | "declined") => void;
}

export interface ListRowProps {
  label: string;
  value?: string;
  kind: "internal" | "external" | "toggle" | "radio";
  onPress?: () => void;
  href?: string;
  checked?: boolean;
  disabled?: boolean;
  sub?: string;
  leading?: ReactNode;
}

export interface SectionHeaderProps {
  label: string;
  tone: "variant" | "blue";
  action?: { label: string; onPress: () => void };
  note?: string;
  id?: string;
}
