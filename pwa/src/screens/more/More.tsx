// D18 More: today's list (logo, blue caps headers, › in-app vs ↗ external), plus Settings and About.

import { usePageTitle } from "../../app/usePageTitle.ts";
import { useT } from "../../i18n/index.ts";
import { useLocation } from "../../state/location.tsx";
import { usePrefs } from "../../state/prefs.ts";
import { ListRow } from "../../ui/ListRow.tsx";
import { MetroMark } from "../../ui/MetroMark.tsx";
import { SectionHeader } from "../../ui/SectionHeader.tsx";
import { links } from "./links.ts";
import styles from "./more.module.css";
import { locationStatusText, notifyStatusText, useShowWelcome } from "./shared.ts";

export default function More() {
  const t = useT();
  const prefs = usePrefs();
  const location = useLocation();
  usePageTitle(t("more.title"));

  const showWelcome = useShowWelcome();

  return (
    <div className={styles.page}>
      <h1 tabIndex={-1} className={styles.logo}>
        <MetroMark height={40} />
        <span className={styles.visuallyHidden}>{t("more.title")}</span>
      </h1>

      <section className={styles.group}>
        <SectionHeader label={t("more.riderResources")} tone="blue" />
        <ListRow kind="internal" label={t("more.routeSchedules")} href="/more/routes" />
        <ListRow kind="internal" label={t("more.serviceAlerts")} href="/more/alerts" />
        <ListRow kind="internal" label={t("more.fares")} href="/fares" />
        <ListRow kind="external" label={t("more.howToRide")} href={links.howToRide} />
        <ListRow kind="external" label={t("more.rideMetroOrg")} href={links.rideMetro} />
      </section>

      <section className={styles.group}>
        <SectionHeader label={t("more.settings")} tone="blue" />
        <ListRow kind="internal" label={t("more.language")} value={t(`more.lang.${prefs.lang}`)} href="/more/settings#language" />
        <ListRow kind="internal" label={t("more.textSize")} value={t(`more.size.${prefs.textSize}`)} href="/more/settings#text-size" />
        <ListRow kind="internal" label={t("more.walkingPace")} value={t(`more.pace.${prefs.walkPace}`)} href="/more/settings#walking-pace" />
        <ListRow kind="internal" label={t("more.location")} value={locationStatusText(location, t)} href="/more/settings#location" />
        <ListRow kind="internal" label={t("more.notifications")} value={notifyStatusText(t)} href="/more/settings#notifications" />
        <ListRow kind="internal" label={t("more.showWelcome")} onPress={showWelcome} />
      </section>

      <section className={styles.group}>
        <SectionHeader label={t("more.contact")} tone="blue" />
        <ListRow kind="external" label={t("more.customerService")} href={links.customerService} />
      </section>

      <section className={styles.group}>
        <ListRow kind="internal" label={t("more.about")} href="/more/about" />
      </section>
    </div>
  );
}
