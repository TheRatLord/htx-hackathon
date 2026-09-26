import { Link } from "react-router";
import type { Itinerary, TransitLeg } from "../../../api/types.ts";
import { useAlerts } from "../../../api/hooks.ts";
import { stopTitle } from "../../../features/trip/timeline.ts";
import { useLang, useT } from "../../../i18n/index.ts";
import { fareLine } from "../../../lib/fares.ts";
import { formatClock, sideLine } from "../../../lib/format.ts";
import { toRouteRef } from "../../../lib/routes.ts";
import { BayTag } from "../../../ui/BayTag.tsx";
import { Icon } from "../../../ui/Icon.tsx";
import { RouteBadge } from "../../../ui/RouteBadge.tsx";
import { StatusWord } from "../../../ui/StatusWord.tsx";
import { ModeStrip } from "./ModeStrip.tsx";
import styles from "./plan.module.css";

/** The first ride's boarding block, so the rider knows where to stand without opening the trip (F3). */
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
      {ride.board.bay && <BayTag bay={ride.board.bay} />}
      <p className={styles.leaves}>
        {t("plan.leaves", { time: formatClock(ride.departureTime, lang) })} {ride.isRealtime && <StatusWord status="live" />}
      </p>
    </>
  );
}

function AlertsLine({ it }: { it: Itinerary }) {
  const t = useT();
  const alerts = useAlerts();
  if (alerts.status === "loading") return null;
  if (alerts.status === "error" || alerts.source === "unavailable") return <p className={styles.variant}>{t("alert.unknown")}</p>;
  const count = alerts.forItinerary(it).length;
  if (!count) return null;
  return (
    <p className={styles.alertLine}>
      <Icon name="warning" size={20} color="var(--c-alert-icon)" />
      {t(alerts.source === "demo" ? "plan.demoAlerts" : "plan.alerts", { count })}
    </p>
  );
}

export function FareLine({ it }: { it: Itinerary }) {
  const t = useT();
  const fare = fareLine(it);
  if (!fare) return null;
  return (
    <p className={styles.fare}>
      {fare.text} ·{" "}
      <Link to={fare.reducedHref} className={styles.link}>
        {t("fareLine.reduced")} ›
      </Link>
    </p>
  );
}

/** D11's itinerary card: today's mode strip and duration, plus the boarding block and fare line. */
export function ItineraryCard({ it, href, sample }: { it: Itinerary; href: string; sample: boolean }) {
  const t = useT();
  const lang = useLang();
  const ride = it.legs.find((l): l is TransitLeg => l.type === "transit");
  const tight = it.legs.flatMap((l) => (l.type === "transit" && l.transfer?.tight ? [l.transfer.waitMin] : []));
  const times = [
    t("plan.timeRange", { start: formatClock(it.startTime, lang), end: formatClock(it.endTime, lang) }),
    it.transfers ? t("plan.transfers", { count: it.transfers }) : t("plan.noTransfers"),
  ].join(" · ");
  return (
    <article className={styles.card}>
      <Link to={href} className={styles.cardMain}>
        <span className={styles.cardTop}>
          <ModeStrip it={it} />
          <span className={styles.durationCol}>
            <span className={styles.duration}>{t("time.min", { n: it.durationMin })}</span>
            {/* A source note, so caption size: it sits beside the strip instead of costing a line (P1). */}
            {sample && <span className={styles.caption}>{t("plan.sampleTimes")}</span>}
          </span>
        </span>
        <span className={styles.times}>{times}</span>
        {tight.length > 0 && <span className={styles.alertText}>{t("plan.tightTransferMin", { min: Math.min(...tight) })}</span>}
        {ride && (
          <>
            <hr className={styles.divider} />
            <BoardingBlock ride={ride} />
          </>
        )}
      </Link>
      <AlertsLine it={it} />
      <div className={styles.cardFoot}>
        <FareLine it={it} />
        <Link to={href} className={`${styles.link} ${styles.details}`} aria-hidden="true" tabIndex={-1}>
          {t("common.details")} ›
        </Link>
      </div>
    </article>
  );
}
