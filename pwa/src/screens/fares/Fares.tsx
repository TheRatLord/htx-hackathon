// D17 Fares: a compact ticket stub that hands off to METRO, plus the fare table from src/data/fares.json.
// Every value there is unconfirmed, and the screen says so once, in the caption over the table, while
// `confirmedByMetro` is false. Reduced fares (seniors, riders with disabilities) come right after the
// base fare, so the rows many older riders need are on the first screen.

import { useState } from "react";
import { usePageTitle } from "../../app/usePageTitle.ts";
import fares from "../../data/fares.json";
import { useLang, useT, type Lang } from "../../i18n/index.ts";
import { Button } from "../../ui/Button.tsx";
import { Dialog } from "../../ui/Dialog.tsx";
import { Icon } from "../../ui/Icon.tsx";
import { ListRow } from "../../ui/ListRow.tsx";
import { SectionHeader } from "../../ui/SectionHeader.tsx";
import { links } from "../more/links.ts";
import { useScrollToHash } from "../more/shared.ts";
import styles from "./Fares.module.css";

type FareItem = (typeof fares.items)[number];

function FareTable({ items, lang }: { items: FareItem[]; lang: Lang }) {
  return (
    <dl className={styles.table}>
      {items.map((item) => (
        <div key={item.key} className={styles.row}>
          <dt>{item.label[lang]}</dt>
          <dd>{item.value[lang]}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function Fares() {
  const t = useT();
  const lang = useLang();
  const [handoff, setHandoff] = useState(false);
  usePageTitle(t("fares.title"));

  // "Reduced fares ›" on itineraries links to #reduced.
  useScrollToHash();

  const note = fares.confirmedByMetro ? undefined : t("fares.pricesToBeConfirmed");
  // The one-ride fare, then who pays less, then passes, Park & Ride and transfers.
  const base = fares.items.filter((i) => i.key === "local");
  const others = fares.items.filter((i) => i.key !== "local");
  const asOf = new Intl.DateTimeFormat(lang === "es" ? "es-US" : "en-US", { dateStyle: "long", timeZone: "UTC" }).format(new Date(fares.asOf));

  return (
    <div className={styles.page}>
      <h1 tabIndex={-1} className={styles.title}>
        {t("fares.title")}
      </h1>

      <section className={styles.ticket} aria-labelledby="fares-ticket">
        <h2 id="fares-ticket" className={styles.ticketTitle}>
          <Icon name="tickets" color="var(--c-accent-icon)" />
          {t("fares.ticketTitle")}
        </h2>
        <Button variant="primary" fullWidth label={t("fares.signIn")} onPress={() => setHandoff(true)} />
      </section>

      {/* One line over the table flags every price in it, so it is on the first screen even at
          360x640 (F9); under the table it fell below the fold on small phones. The page title
          already says "Fares": the base fare needs no header of its own. */}
      <p className={`${styles.caption} ${styles.asOf}`}>
        {t("fares.asOf", { date: asOf })}
        {note && ` ${note}`}
      </p>
      <FareTable items={base} lang={lang} />

      <SectionHeader id="reduced" label={t("fares.reduced")} tone="variant" />
      <FareTable items={fares.reduced} lang={lang} />

      <SectionHeader label={t("fares.passes")} tone="variant" />
      <FareTable items={others} lang={lang} />

      <div className={styles.links}>
        <ListRow kind="external" label={t("fares.reducedHow")} href={links.reducedFares} />
        <ListRow kind="external" label={t("fares.whereToBuy")} href={links.whereToBuy} />
      </div>

      <Dialog
        open={handoff}
        onClose={() => setHandoff(false)}
        title={t("fares.handoffTitle")}
        body={t("fares.handoffBody")}
        actions={[{ label: t("common.ok"), variant: "text", onPress: () => setHandoff(false) }]}
      />
    </div>
  );
}
