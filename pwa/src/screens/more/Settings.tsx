// D19 Settings: one page of radio groups; the More rows deep-link to each group by #anchor.

import type { ReactNode } from "react";
import type { Dep, NearbyRoute, StopSummary } from "../../api/types.ts";
import { usePageTitle } from "../../app/usePageTitle.ts";
import { useBack } from "../../app/useBack.ts";
import { useT } from "../../i18n/index.ts";
import { notifyPermission } from "../../lib/notify.ts";
import { useNow } from "../../state/clock.ts";
import { useLocation } from "../../state/location.tsx";
import { usePrefs, type Prefs } from "../../state/prefs.ts";
import { AppBar } from "../../ui/AppBar.tsx";
import { Button } from "../../ui/Button.tsx";
import { ListRow } from "../../ui/ListRow.tsx";
import { NearbyStopCard } from "../../ui/NearbyStopCard.tsx";
import { SectionHeader } from "../../ui/SectionHeader.tsx";
import styles from "./more.module.css";
import { locationStatusText, notifyStatusText, useScrollToHash, useShowWelcome } from "./shared.ts";

/** Named in their own language and script, so screen readers and fonts pick the right one. */
const COMING_SOON: { name: string; lang: string; dir?: "rtl" }[] = [
  { name: "Tiếng Việt", lang: "vi" },
  { name: "中文", lang: "zh" },
  { name: "العربية", lang: "ar", dir: "rtl" },
];

function Group({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <section className={styles.group}>
      <SectionHeader id={id} label={label} tone="blue" />
      {children}
    </section>
  );
}

function RadioGroup<K extends keyof Prefs>({ label, pref, options }: { label: string; pref: K; options: { value: Prefs[K]; label: string; sub?: string }[] }) {
  const prefs = usePrefs();
  return (
    <div role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <ListRow
          key={String(o.value)}
          kind="radio"
          label={o.label}
          sub={o.sub}
          checked={prefs[pref] === o.value}
          onPress={() => prefs.set({ [pref]: o.value } as Partial<Prefs>)}
        />
      ))}
    </div>
  );
}

const noop = () => {};

/** Stop 342 as a static sample, so the rider sees the chosen text size and pace on a real card. */
function PreviewCard() {
  const now = useNow();
  const dep = (min: number): Dep => ({ departureTime: new Date(now + min * 60_000).toISOString(), isRealtime: false, canceled: false, source: "schedule", tripId: `preview-${min}` });
  const stop: StopSummary = {
    id: "342",
    name: "Lamar St @ Main St",
    lat: 29.75651,
    lon: -95.36412,
    kind: "stop",
    directionLabel: "Westbound",
    side: "North side of Lamar St",
    routes: [{ id: "040", name: "40", color: "#004080", textColor: "#FFFFFF" }],
    subtitle: "",
  };
  const route: NearbyRoute = {
    routeId: "040",
    name: "40",
    color: "#004080",
    textColor: "#FFFFFF",
    directionLabel: "Northbound",
    headsign: "N Shepherd P&R",
    departures: [16, 46].map((m) => ({ ...dep(m), minutesAway: m, delaySeconds: 0 })),
  };
  return <NearbyStopCard stop={stop} walkDistanceM={170} routes={[route]} onOpen={noop} onOpenRoute={noop} onWalk={noop} />;
}

export default function Settings() {
  const t = useT();
  const location = useLocation();
  const showWelcome = useShowWelcome();
  usePageTitle(t("settings.title"));
  useScrollToHash();
  // Offer to ask when nobody has asked yet, or when the last attempt found no fix.
  const canAsk = location.status === "unavailable" || (!location.requested && location.status !== "fix" && location.status !== "denied");

  return (
    <div className={styles.page}>
      <AppBar title={t("settings.title")} onBack={useBack()} />

      <Group id="language" label={t("more.language")}>
        <RadioGroup
          label={t("more.language")}
          pref="lang"
          options={[
            { value: "en", label: t("more.lang.en") },
            { value: "es", label: t("more.lang.es") },
          ]}
        />
        <p className={styles.note}>
          {t("common.comingSoon")}:{" "}
          {COMING_SOON.map(({ name, lang, dir }, i) => (
            <span key={lang}>
              {i > 0 && " · "}
              <bdi lang={lang} dir={dir}>
                {name}
              </bdi>
            </span>
          ))}
        </p>
      </Group>

      <Group id="text-size" label={t("more.textSize")}>
        <RadioGroup
          label={t("more.textSize")}
          pref="textSize"
          options={[
            { value: "standard", label: t("more.size.standard") },
            { value: "large", label: t("more.size.large") },
            { value: "xlarge", label: t("more.size.xlarge") },
          ]}
        />
        <p className={styles.note}>{t("settings.preview")}</p>
        {/* A sample only: nothing on it can be tapped, so testing a size never leaves Settings. */}
        <div className={styles.preview} inert>
          <PreviewCard />
        </div>
      </Group>

      <Group id="walking-pace" label={t("more.walkingPace")}>
        <RadioGroup
          label={t("more.walkingPace")}
          pref="walkPace"
          options={[
            { value: "normal", label: t("more.pace.normal"), sub: t("more.paceSub.normal") },
            { value: "slower", label: t("more.pace.slower"), sub: t("more.paceSub.slower") },
          ]}
        />
        <p className={styles.note}>{t("settings.paceNote", { tooSoon: t("status.tooSoon") })}</p>
      </Group>

      <Group id="location" label={t("more.location")}>
        <p className={styles.text}>{locationStatusText(location, t)}</p>
        {location.status === "denied" && <p className={styles.note}>{t("banner.chromeSteps")}</p>}
        {canAsk && (
          <div className={styles.action}>
            <Button variant="primary" fullWidth icon="my_location" label={t("banner.turnOnLocation")} onPress={location.request} />
          </div>
        )}
      </Group>

      <Group id="notifications" label={t("more.notifications")}>
        <p className={styles.text}>{notifyStatusText(t)}</p>
        {notifyPermission() === "denied" && <p className={styles.note}>{t("settings.notifyChromeSteps")}</p>}
        <p className={styles.note}>{t("settings.notifyNote")}</p>
      </Group>

      <section className={styles.group}>
        <ListRow kind="internal" label={t("more.showWelcome")} onPress={showWelcome} />
      </section>
    </div>
  );
}
