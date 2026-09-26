import { Link } from "react-router";
import type { ReactNode } from "react";
import type { Alert, Itinerary, TransitLeg } from "../../../api/types.ts";
import { useAlerts } from "../../../api/hooks.ts";
import { useLang, useT } from "../../../i18n/index.ts";
import { effectWord } from "../../../lib/alerts.ts";
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

/** The one warning style on a card: the red filled triangle, then red text. */
function Warning({ children }: { children: ReactNode }) {
  return (
    <span className={styles.alertLine}>
      <Icon name="warning" size={20} color="var(--c-alert-icon)" />
      <span>{children}</span>
    </span>
  );
}

/**
 * "⚠ Alert on this trip: Accessibility": what kind of alert, never cut off (22). Alerts that every
 * trip shares are said once above the list (`shared`), so the card keeps only its own. The full
 * text is on My Itinerary, under the ride it touches.
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
  return <Warning>{list.length === 1 ? t("plan.alertAbout", { what: effectWord(list[0].effect, lang) }) : t("plan.alerts", { count: list.length })}</Warning>;
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

/** Above the cards: "⚠ Alert on these trips: Accessibility ›", once instead of on every card. */
export function SharedAlerts({ list, unavailable }: { list: Alert[]; unavailable: boolean }) {
  const t = useT();
  const lang = useLang();
  if (unavailable) return <p className={styles.variant}>{t("alert.unknown")}</p>;
  if (!list.length) return null;
  const text = list.length === 1 ? t("plan.alertAllAbout", { what: effectWord(list[0].effect, lang) }) : t("plan.alertsAll", { count: list.length });
  const href = list.length === 1 ? `/more/alerts/${encodeURIComponent(list[0].id)}` : "/more/alerts";
  return (
    <Link to={href} className={styles.sharedAlert}>
      <Warning>{text} ›</Warning>
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

/** D11's itinerary card: today's mode strip and duration, the times, one Board line and the alert kind. */
export function ItineraryCard({ it, href, sharedAlerts = new Set() }: { it: Itinerary; href: string; sharedAlerts?: ReadonlySet<string> }) {
  const t = useT();
  const lang = useLang();
  const ride = it.legs.find((l): l is TransitLeg => l.type === "transit");
  const tight = it.legs.flatMap((l) => (l.type === "transit" && l.transfer?.tight ? [l.transfer.waitMin] : []));
  const times = [
    t("plan.timeRange", { start: formatClock(it.startTime, lang), end: formatClock(it.endTime, lang) }),
    it.transfers ? t("plan.transfers", { count: it.transfers }) : t("plan.noTransfers"),
  ].join(" · ");
  // v2.71's price under the duration ("$1.25"); the Details screen says which fare it is.
  const fare = fareLine(it) && fares.items.find((i) => i.key === "local")?.value[lang];
  return (
    <article className={styles.card}>
      {/* The whole card opens Details, as on v2.71: no second link in a footer. */}
      <Link to={href} className={styles.cardMain}>
        <span className={styles.cardTop}>
          <ModeStrip it={it} />
          <span className={styles.durationCol}>
            <span className={styles.duration}>{t("time.min", { n: it.durationMin })}</span>
            {fare && (
              <span className={styles.fareSmall}>
                <span className="visually-hidden">{t("fareLine.local", { price: fare })}</span>
                <span aria-hidden="true">{fare}</span>
              </span>
            )}
          </span>
        </span>
        <span className={styles.times}>{times}</span>
        {tight.length > 0 && <Warning>{t("plan.tightTransferMin", { min: Math.min(...tight) })}</Warning>}
        {ride && <BoardLine ride={ride} />}
        <AlertsLine it={it} shared={sharedAlerts} />
      </Link>
    </article>
  );
}
