import { Link } from "react-router";
import type { Itinerary, TransitLeg } from "../../../api/types.ts";
import { useAlerts } from "../../../api/hooks.ts";
import { stopTitle } from "../../../features/trip/timeline.ts";
import { useLang, useT } from "../../../i18n/index.ts";
import { alertText, effectWord } from "../../../lib/alerts.ts";
import fares from "../../../data/fares.json";
import { fareLine } from "../../../lib/fares.ts";
import { formatClock, sideLine } from "../../../lib/format.ts";
import { toRouteRef } from "../../../lib/routes.ts";
import { BayTag } from "../../../ui/BayTag.tsx";
import { Icon } from "../../../ui/Icon.tsx";
import { RouteBadge } from "../../../ui/RouteBadge.tsx";
import { StatusWord } from "../../../ui/StatusWord.tsx";
import { ModeStrip } from "./ModeStrip.tsx";
import styles from "./plan.module.css";

/**
 * The first ride's boarding block, so the rider knows where to stand without opening the trip (F3):
 * "BOARD [80] to MLK & PARK VILLAGE", the stop, its side, and when it leaves, in four short lines.
 */
function BoardingBlock({ ride }: { ride: TransitLeg }) {
  const t = useT();
  const lang = useLang();
  const route = toRouteRef(ride.route);
  const side = sideLine({ ...ride.board, kind: route.mode }, { withCompass: false, lang });
  return (
    <>
      <p className={styles.boardLine}>
        {t("plan.board").toUpperCase()} <RouteBadge route={route} size="sm" /> {t("headsign.to")} {ride.headsign.toUpperCase()}
      </p>
      <p className={styles.boardStop}>{stopTitle(ride.board)}</p>
      {side && <p className={styles.variant}>{side}</p>}
      <p className={styles.leaves}>
        <span>{t("plan.leaves", { time: formatClock(ride.departureTime, lang) })}</span>
        {ride.isRealtime && <StatusWord status="live" />}
        {ride.board.bay && <BayTag bay={ride.board.bay} />}
      </p>
    </>
  );
}

/** "⚠ Stop moved: Hobby Airport stop…": what the alert is about, in one line (the app banner says it's a demo). */
function AlertsLine({ it }: { it: Itinerary }) {
  const t = useT();
  const lang = useLang();
  const alerts = useAlerts();
  if (alerts.status === "loading") return null;
  if (alerts.status === "error" || alerts.source === "unavailable") return <p className={styles.variant}>{t("alert.unknown")}</p>;
  const list = alerts.forItinerary(it);
  if (!list.length) return null;
  return (
    <p className={styles.alertLine}>
      <Icon name="warning" size={20} color="var(--c-alert-icon)" />
      <span className={styles.alertOne}>
        {list.length === 1 ? `${effectWord(list[0].effect, lang)}: ${alertText(list[0], "header", lang).text}` : t("plan.alerts", { count: list.length })}
      </span>
    </p>
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

/** D11's itinerary card: today's mode strip and duration, plus the boarding block and fare line. */
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
        {ride && (
          <div className={styles.board}>
            <BoardingBlock ride={ride} />
          </div>
        )}
      </Link>
      <AlertsLine it={it} />
    </article>
  );
}
