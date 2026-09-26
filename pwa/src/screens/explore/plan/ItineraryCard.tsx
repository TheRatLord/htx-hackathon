import { Link } from "react-router";
import type { ReactNode } from "react";
import type { Alert, Itinerary, TransitLeg } from "../../../api/types.ts";
import { useAlerts } from "../../../api/hooks.ts";
import { useLang, useT } from "../../../i18n/index.ts";
import { alertText, effectWord, isAdvisory } from "../../../lib/alerts.ts";
import fares from "../../../data/fares.json";
import { fareLine } from "../../../lib/fares.ts";
import { formatClock } from "../../../lib/format.ts";
import { BayTag } from "../../../ui/BayTag.tsx";
import { Icon } from "../../../ui/Icon.tsx";
import { StatusWord } from "../../../ui/StatusWord.tsx";
import { ModeStrip } from "./ModeStrip.tsx";
import styles from "./plan.module.css";

/**
 * Where to get on, in one bold line (22): "Board 80 at #11424 · 12:15 PM", plus Live and the bay
 * when there is one. The route is plain text: its chip is already in the mode strip above. The
 * stop's name, side and headsign are on My Itinerary, one tap away.
 */
function BoardLine({ ride }: { ride: TransitLeg }) {
  const t = useT();
  const lang = useLang();
  const time = formatClock(ride.departureTime, lang);
  const text = ride.board.id
    ? t("plan.boardAt", { route: ride.route.name, id: ride.board.id, time })
    : `${t("plan.board")} ${ride.route.name} · ${time}`;
  return (
    <span className={styles.boardLine}>
      <span>{text}</span>
      {ride.isRealtime && <StatusWord status="live" />}
      {ride.board.bay && <BayTag bay={ride.board.bay} />}
    </span>
  );
}

/**
 * A card's warning line: red ⚠ for service changes (and a tight transfer), navy ⓘ for advisories
 * such as an accessibility tip, the same rule as AlertBox (22, 28).
 */
function Warning({ children, advisory = false, clamp = false }: { children: ReactNode; advisory?: boolean; clamp?: boolean }) {
  return (
    <span className={`${styles.alertLine} ${advisory ? styles.advisoryLine : ""}`}>
      <Icon name={advisory ? "info" : "warning"} size={20} color={advisory ? "var(--c-primary)" : "var(--c-alert-icon)"} />
      <span className={clamp ? styles.clamp2 : undefined}>{children}</span>
    </span>
  );
}

/** One alert in plain words ("Hobby Airport: use the ground-floor exit…"); several are counted. */
function alertWords(list: Alert[], lang: ReturnType<typeof useLang>): string | undefined {
  if (list.length !== 1) return undefined;
  const a = list[0];
  return alertText(a, "header", lang).text || effectWord(a.effect, lang);
}

/**
 * The card's own alert, in plain words, 2 lines at most. Alerts that every trip shares are said
 * once above the list (`shared`). The full text is on My Itinerary, under the ride it touches.
 */
function AlertsLine({ it, shared }: { it: Itinerary; shared: ReadonlySet<string> }) {
  const t = useT();
  const lang = useLang();
  const alerts = useAlerts();
  if (alerts.status === "loading") return null;
  // "Alerts unavailable" is said once, by the shared banner.
  if (alerts.status === "error" || alerts.source === "unavailable") return null;
  const list = alerts.forItinerary(it).filter((a) => !shared.has(a.id));
  if (!list.length) return null;
  return (
    <Warning advisory={list.every((a) => isAdvisory(a.effect))} clamp>
      {alertWords(list, lang) ?? t("plan.alerts", { count: list.length })}
    </Warning>
  );
}

/** The ids of the alerts every trip in the list shares (the destination's, usually). */
export function useSharedAlerts(its: Itinerary[]): { ids: Set<string>; list: Alert[]; unavailable: boolean } {
  const alerts = useAlerts();
  if (alerts.status === "loading") return { ids: new Set(), list: [], unavailable: false };
  if (alerts.status === "error" || alerts.source === "unavailable") return { ids: new Set(), list: [], unavailable: true };
  // With one trip, its alerts stay on its card.
  if (its.length < 2) return { ids: new Set(), list: [], unavailable: false };
  const [first, ...rest] = its.map((it) => alerts.forItinerary(it));
  const list = (first ?? []).filter((a) => rest.every((l) => l.some((b) => b.id === a.id)));
  return { ids: new Set(list.map((a) => a.id)), list, unavailable: false };
}

/** Above the cards, once instead of on every card: "ⓘ Hobby Airport: use the ground-floor exit… ›". */
export function SharedAlerts({ list, unavailable }: { list: Alert[]; unavailable: boolean }) {
  const t = useT();
  const lang = useLang();
  if (unavailable) return <p className={styles.variant}>{t("alert.unknown")}</p>;
  if (!list.length) return null;
  const text = alertWords(list, lang) ?? t("plan.alertsAll", { count: list.length });
  const href = list.length === 1 ? `/more/alerts/${encodeURIComponent(list[0].id)}` : "/more/alerts";
  return (
    <Link to={href} className={styles.sharedAlert}>
      <Warning advisory={list.every((a) => isAdvisory(a.effect))} clamp>
        {text} ›
      </Warning>
    </Link>
  );
}

/** "Local fare $1.25 · Reduced fares ›"; on the list card, only the fare (the card opens Details). */
export function FareLine({ it, link = true }: { it: Itinerary; link?: boolean }) {
  const t = useT();
  const fare = fareLine(it);
  if (!fare) return null;
  return (
    <p className={styles.fare}>
      {fare.text}
      {link && (
        <>
          {" · "}
          <Link to={fare.reducedHref} className={styles.link}>
            {t("fareLine.reduced")} ›
          </Link>
        </>
      )}
    </p>
  );
}

/** "12:59 PM" with a small "PM", so the arrival reads as one bold number (22). */
function Clock({ iso }: { iso: string }) {
  const lang = useLang();
  const text = formatClock(iso, lang);
  const m = /^(.*\d)(\s*)([^\d\s].*)$/u.exec(text);
  if (!m) return <>{text}</>;
  return (
    <>
      {m[1]}
      <span className={styles.clockUnit}>{"\u00a0" + m[3]}</span>
    </>
  );
}

/**
 * D11's itinerary card: today's mode strip, and on the right the arrival in bold (the list is
 * sorted by it) over the trip's minutes; then when to leave, one Board line and the alert kind.
 * `later` are the same buses from the same stops later on, said on one line instead of more cards.
 */
export function ItineraryCard({
  it,
  href,
  sharedAlerts = new Set(),
  later = [],
}: {
  it: Itinerary;
  href: string;
  sharedAlerts?: ReadonlySet<string>;
  later?: { it: Itinerary; href: string }[];
}) {
  const t = useT();
  const lang = useLang();
  const ride = it.legs.find((l): l is TransitLeg => l.type === "transit");
  const tight = it.legs.flatMap((l) => (l.type === "transit" && l.transfer?.tight ? [l.transfer.waitMin] : []));
  // v2.71's price, on the when line; the Details screen says which fare it is.
  const fare = fareLine(it) && fares.items.find((i) => i.key === "local")?.value[lang];
  const times = [
    t("plan.leaveAt", { time: formatClock(it.startTime, lang) }),
    it.transfers ? t("plan.transfers", { count: it.transfers }) : t("plan.noTransfers"),
    fare ?? "",
  ]
    .filter(Boolean)
    .join(" · ");
  const boardTime = (x: Itinerary) => {
    const r = x.legs.find((l): l is TransitLeg => l.type === "transit");
    return formatClock(r?.departureTime ?? x.startTime, lang);
  };
  return (
    <article className={styles.card}>
      {/* The whole card opens Details, as on v2.71: no second link in a footer. */}
      <Link to={href} className={styles.cardMain} >
        <span className={styles.cardTop}>
          <ModeStrip it={it} />
          <span className={styles.durationCol}>
            <span className="visually-hidden">{t("plan.arrive", { time: formatClock(it.endTime, lang), min: it.durationMin })}</span>
            <span className={styles.duration} aria-hidden="true">
              <Clock iso={it.endTime} />
            </span>
            <span className={styles.fareSmall} aria-hidden="true">
              {t("time.min", { n: it.durationMin })}
            </span>
          </span>
        </span>
        <span className={styles.times}>{times}</span>
        {tight.length > 0 && <Warning>{t("plan.tightTransferMin", { min: Math.min(...tight) })}</Warning>}
        {ride && <BoardLine ride={ride} />}
        <AlertsLine it={it} shared={sharedAlerts} />
      </Link>
      {later.length > 0 && (
        <p className={styles.later}>
          {t("plan.alsoAt")} 
          {later.map((l, i) => (
            <span key={l.href}>
              {i > 0 && ", "}
              <Link to={l.href} className={styles.link} aria-label={t("plan.alsoAtA11y", { time: boardTime(l.it) })}>
                {boardTime(l.it)}&nbsp;›
              </Link>
            </span>
          ))}
        </p>
      )}
    </article>
  );
}
