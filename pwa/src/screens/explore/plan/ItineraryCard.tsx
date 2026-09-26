import { Link } from "react-router";
import type { Itinerary, TransitLeg } from "../../../api/types.ts";
import { useAlerts } from "../../../api/hooks.ts";
import { useLang, useT } from "../../../i18n/index.ts";
import { effectWord } from "../../../lib/alerts.ts";
import fares from "../../../data/fares.json";
import { fareLine } from "../../../lib/fares.ts";
import { formatClock } from "../../../lib/format.ts";
import { toRouteRef } from "../../../lib/routes.ts";
import { BayTag } from "../../../ui/BayTag.tsx";
import { Icon } from "../../../ui/Icon.tsx";
import { RouteBadge } from "../../../ui/RouteBadge.tsx";
import { StatusWord } from "../../../ui/StatusWord.tsx";
import { ModeStrip } from "./ModeStrip.tsx";
import styles from "./plan.module.css";

/**
 * Where to get on, in one line (22): "Board [80] at #11424 · 12:15 PM", plus Live and the bay when
 * there is one. The stop's name, side and headsign are on My Itinerary, one tap away.
 */
function BoardLine({ ride }: { ride: TransitLeg }) {
  const t = useT();
  const lang = useLang();
  const route = toRouteRef(ride.route);
  const MARK = "\u0000";
  const time = formatClock(ride.departureTime, lang);
  const text = ride.board.id ? t("plan.boardAt", { route: MARK, id: ride.board.id, time }) : `${t("plan.board")} ${MARK} · ${time}`;
  const [before, after = ""] = text.split(MARK);
  return (
    <span className={styles.boardLine}>
      <span>
        {before}
        <RouteBadge route={route} size="sm" />
        {after}
      </span>
      {ride.isRealtime && <StatusWord status="live" />}
      {ride.board.bay && <BayTag bay={ride.board.bay} />}
    </span>
  );
}

/**
 * "⚠ Alert on this trip: Accessibility": what kind of alert, never cut off (22). Its full text is
 * on My Itinerary, under the ride it touches.
 */
function AlertsLine({ it }: { it: Itinerary }) {
  const t = useT();
  const lang = useLang();
  const alerts = useAlerts();
  if (alerts.status === "loading") return null;
  if (alerts.status === "error" || alerts.source === "unavailable") return <span className={styles.variant}>{t("alert.unknown")}</span>;
  const list = alerts.forItinerary(it);
  if (!list.length) return null;
  return (
    <span className={styles.alertLine}>
      <Icon name="warning" size={20} color="var(--c-alert-icon)" />
      <span>{list.length === 1 ? t("plan.alertAbout", { what: effectWord(list[0].effect, lang) }) : t("plan.alerts", { count: list.length })}</span>
    </span>
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
export function ItineraryCard({ it, href }: { it: Itinerary; href: string }) {
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
        {tight.length > 0 && <span className={styles.alertText}>{t("plan.tightTransferMin", { min: Math.min(...tight) })}</span>}
        {ride && <BoardLine ride={ride} />}
        <AlertsLine it={it} />
      </Link>
    </article>
  );
}
