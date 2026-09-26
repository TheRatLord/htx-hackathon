// D11's Edit layout: today's From/To box with its round swap button, one "Leave now ▾" row that
// opens the time chips, and the rider's recent and saved places under "Where to?".

import { useEffect, useRef, useState } from "react";
import { useLang, useT } from "../../../i18n/index.ts";
import { formatClock } from "../../../lib/format.ts";
import type { PlanQuery } from "../../../lib/planQuery.ts";
import { Button } from "../../../ui/Button.tsx";
import { FilterChip } from "../../../ui/FilterChip.tsx";
import { Icon } from "../../../ui/Icon.tsx";
import { SegmentedControl } from "../../../ui/SegmentedControl.tsx";
import { useRecents } from "../../../state/recents.ts";
import { useSaved } from "../../../state/saved.ts";
import styles from "./plan.module.css";
import { chipFor, RELATIVE_CHIPS, relativeTime } from "./timeChoice.ts";

/** Where the From field stands: a chosen place, still finding the rider, or location off. */
export type FromView = { kind: "place"; name: string } | { kind: "finding" } | { kind: "off" };

interface FromToProps {
  query: PlanQuery;
  from: FromView;
  onPick: (field: "from" | "to") => void;
  onSwap: () => void;
  onClearTo: () => void;
}

export function FromToBox({ query, from, onPick, onSwap, onClearTo }: FromToProps) {
  const t = useT();
  const fromRef = useRef<HTMLButtonElement>(null);
  const off = from.kind === "off";
  // Location off: move focus to the field that needs a choice (after the layout focuses the title).
  useEffect(() => {
    if (!off) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => fromRef.current?.focus()));
    return () => cancelAnimationFrame(id);
  }, [off]);
  const fromText = from.kind === "place" ? from.name : t(off ? "plan.locationOff" : "plan.findingLocation");
  const toText = query.toName ?? t("plan.whereTo");
  return (
    <div className={styles.box}>
      <button ref={fromRef} type="button" className={styles.place} onClick={() => onPick("from")} aria-label={t("plan.fromA11y", { place: fromText })}>
        {from.kind === "finding" ? <span className={styles.ring} /> : <span className={styles.dot} />}
        <span className={from.kind === "place" ? undefined : off ? styles.placeAlert : styles.placeholder}>{fromText}</span>
      </button>
      <div className={styles.between} aria-hidden="true">
        <Icon name="arrow_downward" size={20} />
        <hr />
      </div>
      <div className={styles.toRow}>
        <button type="button" className={styles.place} onClick={() => onPick("to")} aria-label={t("plan.toA11y", { place: toText })}>
          <Icon name="place" color="var(--c-dest-pin)" />
          {/* Empty or filled, the destination looks like a field, so riders see they can change it. */}
          <span className={`${styles.field} ${query.to ? "" : styles.fieldEmpty}`}>{toText}</span>
        </button>
        {query.to && (
          <button type="button" className={styles.clear} onClick={onClearTo} aria-label={t("plan.clearTo")}>
            <Icon name="close" size={20} />
          </button>
        )}
      </div>
      {/* v2.71's round swap button, on the line between the two fields. */}
      <button type="button" className={styles.swap} onClick={onSwap} aria-label={t("plan.swapA11y")}>
        <Icon name="swap_vert" size={24} />
      </button>
    </div>
  );
}

/** "Leave now" / "Leave 8:30 PM" / "Arrive by 8:30 PM". */
export function useWhenText(q: PlanQuery): string {
  const t = useT();
  const lang = useLang();
  if (!q.time) return t("plan.leaveNow");
  return t(q.arriveBy ? "plan.arriveBy" : "plan.leaveAt", { time: formatClock(q.time, lang) });
}

/** Local "YYYY-MM-DDTHH:mm" for <input type="datetime-local">. */
function localInput(ms: number): string {
  return new Date(ms - new Date(ms).getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function OtherTime({ query, onSet, onCancel }: { query: PlanQuery; onSet: (q: PlanQuery) => void; onCancel: () => void }) {
  const t = useT();
  const [value, setValue] = useState(() => localInput(query.time ? Date.parse(query.time) : Date.now()));
  const [mode, setMode] = useState<"leave" | "arrive">(query.arriveBy ? "arrive" : "leave");
  const valid = !Number.isNaN(Date.parse(value));
  // It opens below the chips, maybe below the fold: bring it into the sheet's view.
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Braces: scrollIntoView returns a promise in newer Chromium, and an effect may only return a cleanup.
    panel.current?.scrollIntoView({ block: "nearest" });
  }, []);
  return (
    <div ref={panel} className={styles.otherTime}>
      <label>
        {t("plan.other.input")}
        <input type="datetime-local" value={value} onChange={(e) => setValue(e.target.value)} />
      </label>
      <SegmentedControl
        ariaLabel={t("plan.other.title")}
        value={mode}
        onChange={setMode}
        options={[
          { value: "leave", label: t("plan.other.leave") },
          { value: "arrive", label: t("plan.other.arrive") },
        ]}
      />
      <div className={styles.actions}>
        <Button
          variant="tonal"
          label={t("plan.other.use")}
          disabled={!valid}
          onPress={() => onSet({ ...query, time: new Date(value).toISOString(), arriveBy: mode === "arrive" || undefined })}
        />
        <Button variant="text" label={t("common.cancel")} onPress={onCancel} />
      </div>
    </div>
  );
}

/**
 * v2.71's one "🕒 Leave now ▾" row. It opens Now / In 15 min / In 30 min / In 1 hr / Other time,
 * so the form keeps one row for one decision. A chip re-plans immediately and closes the row.
 */
export function WhenRow({ query, onChange }: { query: PlanQuery; onChange: (q: PlanQuery) => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [other, setOther] = useState(false);
  const chip = chipFor(query);
  const when = useWhenText(query);
  const pick = (q: PlanQuery) => {
    setOpen(false);
    setOther(false);
    onChange(q);
  };
  return (
    <>
      <button type="button" className={styles.whenRow} aria-expanded={open} onClick={() => setOpen(!open)} aria-label={t("plan.whenA11y", { when })}>
        <Icon name="schedule" color="var(--c-text-variant)" />
        <span>{when}</span>
        <Icon name={open ? "expand_less" : "expand_more"} />
      </button>
      {open && (
        <div className={styles.chipsWrap} role="group" aria-label={t("plan.when")}>
          <FilterChip label={t("plan.chip.now")} selected={chip === "now"} onPress={() => pick({ ...query, time: undefined, arriveBy: undefined })} />
          {RELATIVE_CHIPS.map((c) => (
            <FilterChip key={c.chip} label={t(`plan.chip.${c.chip}`)} selected={chip === c.chip} onPress={() => pick(relativeTime(query, c.chip, c.min, Date.now()))} />
          ))}
          <FilterChip label={`${t("plan.chip.other")} ▾`} selected={chip === "other"} onPress={() => setOther(!other)} />
        </div>
      )}
      {open && other && <OtherTime query={query} onCancel={() => setOther(false)} onSet={pick} />}
    </>
  );
}

export interface PlacePick {
  to: string;
  toName: string;
  icon: "schedule" | "star" | "place";
}

/**
 * Where most riders go, for a first visit with nothing recent or saved yet (21): the form is never
 * a blank half sheet. Names are the landmarks' own, as search shows them.
 */
const POPULAR: PlacePick[] = [
  { to: "landmark:hobby-airport", toName: "Hobby Airport", icon: "place" },
  { to: "landmark:texas-medical-center", toName: "Texas Medical Center Transit Center", icon: "place" },
  { to: "landmark:downtown-tc", toName: "Downtown Transit Center", icon: "place" },
];

/** Up to three places to tap instead of type: recent trip destinations first, then saved stops, else popular places. */
export function usePlacePicks(query: PlanQuery): PlacePick[] {
  const { trips } = useRecents();
  const { stops } = useSaved();
  const picks: PlacePick[] = [];
  const seen = new Set([query.to, query.from]);
  const add = (p: PlacePick) => {
    if (picks.length >= 3 || seen.has(p.to)) return;
    seen.add(p.to);
    picks.push(p);
  };
  for (const r of trips) if (r.query.to && r.query.toName) add({ to: r.query.to, toName: r.query.toName, icon: "schedule" });
  for (const s of stops) add({ to: s.id, toName: `${s.name} (${s.id})`, icon: "star" });
  if (!picks.length) POPULAR.forEach(add);
  return picks;
}

export function PlacePicks({ picks, onPick }: { picks: PlacePick[]; onPick: (p: PlacePick) => void }) {
  const t = useT();
  if (!picks.length) return null;
  const title = t(picks.every((p) => p.icon === "place") ? "plan.popularPlaces" : "plan.recentPlaces");
  return (
    <section className={styles.picks} aria-label={title}>
      <h2 className={styles.picksTitle}>{title}</h2>
      <ul>
        {picks.map((p) => (
          <li key={p.to}>
            <button type="button" className={styles.pick} onClick={() => onPick(p)}>
              <Icon name={p.icon} color="var(--c-text-variant)" />
              <span>{p.toName}</span>
              <Icon name="chevron_right" color="var(--c-text-variant)" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
