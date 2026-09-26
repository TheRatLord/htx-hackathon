// D21 About this prototype: data sources, whether live times are on, and the METRO handoff.

import pkg from "../../../package.json";
import { useHealth } from "../../api/hooks.ts";
import type { Health } from "../../api/types.ts";
import { usePageTitle } from "../../app/usePageTitle.ts";
import { useBack } from "../../app/useBack.ts";
import { useT } from "../../i18n/index.ts";
import { useInstallPrompt } from "../../state/install.ts";
import { AppBar } from "../../ui/AppBar.tsx";
import { ListRow } from "../../ui/ListRow.tsx";
import { SectionHeader } from "../../ui/SectionHeader.tsx";
import styles from "./more.module.css";

function liveKey(health: Health | undefined): string {
  if (!health) return "about.liveUnknown";
  const { metroArrivalsApi, gtfsRtTripUpdates, simulated } = health.realtime;
  if (simulated) return "about.liveSimulated";
  return metroArrivalsApi || gtfsRtTripUpdates ? "about.liveOn" : "about.liveOff";
}

export default function About() {
  const t = useT();
  const health = useHealth();
  const install = useInstallPrompt();
  usePageTitle(t("about.title"));
  const version = health.data?.feedVersion;

  return (
    <div className={styles.page}>
      <AppBar title={t("about.title")} onBack={useBack()} />
      <p className={styles.text}>{t("about.intro")}</p>

      <section className={styles.group}>
        <SectionHeader label={t("about.sources")} tone="blue" />
        <ul className={styles.list}>
          <li>{version ? t("about.gtfs", { version }) : t("about.gtfsUnknown")}</li>
          <li>{t("about.transitApi")}</li>
          <li>{t("about.alerts")}</li>
          <li>{t("about.tiles")}</li>
          <li>{t("about.osrm")}</li>
          <li>{t("about.planner")}</li>
        </ul>
      </section>

      <section className={styles.group}>
        <SectionHeader label={t("about.status")} tone="blue" />
        <p className={styles.text}>{t(liveKey(health.data))}</p>
        {health.data?.offline && <p className={styles.text}>{t("about.offlineMode")}</p>}
        <p className={styles.text}>{t("about.handoff")}</p>
      </section>

      {install.available && (
        <section className={styles.group}>
          <ListRow kind="internal" label={t("about.install")} onPress={() => void install.prompt()} />
        </section>
      )}

      <p className={styles.caption}>{t("about.version", { version: pkg.version })}</p>
    </div>
  );
}
