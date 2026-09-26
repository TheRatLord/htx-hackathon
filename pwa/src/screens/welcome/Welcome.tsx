// D1 Welcome: the one first-launch screen. Language and text size apply as they are changed.

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { usePageTitle } from "../../app/usePageTitle.ts";
import { useT, type Lang } from "../../i18n/index.ts";
import { useLocation } from "../../state/location.tsx";
import { setPrefs, usePrefs, type TextSize } from "../../state/prefs.ts";
import { Button } from "../../ui/Button.tsx";
import { Icon } from "../../ui/Icon.tsx";
import { MetroMark } from "../../ui/MetroMark.tsx";
import { SegmentedControl } from "../../ui/SegmentedControl.tsx";
import styles from "./Welcome.module.css";

/** Resolves once the rider has answered the browser's location question (or it can't be asked). */
function whenPermissionAnswered(): Promise<void> {
  if (!navigator.permissions) return Promise.resolve();
  return navigator.permissions
    .query({ name: "geolocation" })
    .then(
      (p) =>
        new Promise<void>((resolve) => {
          if (p.state !== "prompt") return resolve();
          p.addEventListener("change", () => p.state !== "prompt" && resolve());
        }),
    )
    .catch(() => undefined);
}

export default function Welcome() {
  const t = useT();
  const navigate = useNavigate();
  const prefs = usePrefs();
  const location = useLocation();
  const [asking, setAsking] = useState(false);
  usePageTitle(t("welcome.pageTitle"));

  const finish = useCallback(() => {
    setPrefs({ welcomed: true });
    navigate("/explore", { replace: true });
  }, [navigate]);

  // "Show stops near me": go on as soon as the rider allows or denies, fix or not (Explore says "Finding…").
  useEffect(() => {
    if (!asking) return;
    let active = true;
    void whenPermissionAnswered().then(() => active && finish());
    return () => {
      active = false;
    };
  }, [asking, finish]);

  const showStops = () => {
    location.request();
    setAsking(true);
  };

  return (
    <main className={styles.page}>
      <div className={styles.mark}>
        <MetroMark />
      </div>
      <div className={styles.hero}>
        <Icon name="place" size={72} color="var(--c-brand-blue-dark)" />
      </div>
      <h1 tabIndex={-1} className={styles.title}>
        {t("welcome.title")}
      </h1>
      <p className={styles.body}>{t("welcome.body")}</p>

      <h2 className={styles.label}>{t("welcome.language")}</h2>
      <SegmentedControl<Lang>
        ariaLabel={t("welcome.language")}
        value={prefs.lang}
        onChange={(lang) => prefs.set({ lang })}
        options={[
          { value: "en", label: "English" },
          { value: "es", label: "Español" },
        ]}
      />

      <h2 className={styles.label}>{t("welcome.textSize")}</h2>
      <SegmentedControl<TextSize>
        ariaLabel={t("welcome.textSize")}
        value={prefs.textSize}
        onChange={(textSize) => prefs.set({ textSize })}
        options={[
          { value: "standard", label: "A", sub: t("welcome.sizeStandard") },
          { value: "large", label: "A+", sub: t("welcome.sizeLarge") },
          { value: "xlarge", label: "A++", sub: t("welcome.sizeXlarge") },
        ]}
      />

      <div className={styles.actions}>
        <Button variant="primary" fullWidth icon="my_location" label={t("welcome.showStops")} onPress={showStops} />
        <Button variant="text" label={t("welcome.notNow")} onPress={finish} />
      </div>
    </main>
  );
}
