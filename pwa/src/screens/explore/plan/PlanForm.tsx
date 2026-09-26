// D11's Edit layout: today's From/To box and time chips ("Leave at" became "Other time ▾").

import { useEffect, useRef, useState } from "react";
import { useLang, useT } from "../../../i18n/index.ts";
import { formatClock } from "../../../lib/format.ts";
import type { PlanQuery } from "../../../lib/planQuery.ts";
import { Button } from "../../../ui/Button.tsx";
import { FilterChip } from "../../../ui/FilterChip.tsx";
import { Icon } from "../../../ui/Icon.tsx";
import { SegmentedControl } from "../../../ui/SegmentedControl.tsx";
import styles from "./plan.module.css";
import { chipFor, RELATIVE_CHIPS, relativeTime } from "./timeChoice.ts";

/** Where the From field stands: a chosen place, still finding the rider, or location off. */
export type FromView = { kind: "place"; name: string } | { kind: "finding" } | { kind: "off" };

interface FromToProps {
  query: PlanQuery;
  from: FromView;
  onPick: (field: "from" | "to") => void;
  onSwap: () => void;
}

export function FromToBox({ query, from, onPick, onSwap }: FromToProps) {
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
      <button type="button" className={styles.place} onClick={() => onPick("to")} aria-label={t("plan.toA11y", { place: toText })}>
        <Icon name="place" color="var(--c-dest-pin)" />
        <span className={query.to ? undefined : styles.emptyField}>{toText}</span>
      </button>
      <button type="button" className={styles.swap} onClick={onSwap} aria-label={t("plan.swapA11y")}>
        <Icon name="swap_vert" size={20} />
        {t("plan.swap")}
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
  useEffect(() => panel.current?.scrollIntoView({ block: "nearest" }), []);
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

/** Now / In 15 min / In 30 min / In 1 hr / Other time ▾. A chip change re-plans immediately. */
export function TimeChips({ query, onChange }: { query: PlanQuery; onChange: (q: PlanQuery) => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const chip = chipFor(query);
  const when = useWhenText(query);
  return (
    <>
      <div className={styles.chipsWrap} role="group" aria-label={t("plan.when")}>
        <FilterChip label={t("plan.chip.now")} selected={chip === "now"} onPress={() => onChange({ ...query, time: undefined, arriveBy: undefined })} />
        {RELATIVE_CHIPS.map((c) => (
          <FilterChip key={c.chip} label={t(`plan.chip.${c.chip}`)} selected={chip === c.chip} onPress={() => onChange(relativeTime(query, c.chip, c.min, Date.now()))} />
        ))}
        <FilterChip label={`${chip === "other" ? when : t("plan.chip.other")} ▾`} selected={chip === "other"} onPress={() => setOpen(!open)} />
      </div>
      {open && (
        <OtherTime
          query={query}
          onCancel={() => setOpen(false)}
          onSet={(q) => {
            setOpen(false);
            onChange(q);
          }}
        />
      )}
    </>
  );
}
