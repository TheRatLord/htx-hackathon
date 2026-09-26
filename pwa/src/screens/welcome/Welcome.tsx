// D1 Welcome: the one first-launch screen. Language and text size apply as they are changed.

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { usePageTitle } from "../../app/usePageTitle.ts";
import { useT, type Lang } from "../../i18n/index.ts";
import { useLocation, type LocationStatus } from "../../state/location.tsx";
import { setPrefs, usePrefs, type TextSize } from "../../state/prefs.ts";
import { Button } from "../../ui/Button.tsx";
import { Icon } from "../../ui/Icon.tsx";
import { MetroMark } from "../../ui/MetroMark.tsx";
import { SegmentedControl } from "../../ui/SegmentedControl.tsx";
import styles from "./Welcome.module.css";

/** Past this, "Show stops near me" goes on to Explore even if the browser never answers (a dismissed prompt stays "prompt"). */
const ANSWER_TIMEOUT_MS = 10_000;

const answered = (s: LocationStatus) => s === "granted-waiting" || s === "fix" || s === "denied" || s === "unavailable";

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
    if (asking && answered(location.status)) finish();
  }, [asking, location.status, finish]);

  useEffect(() => {
    if (!asking) return;
    const timer = setTimeout(finish, ANSWER_TIMEOUT_MS);
    return () => clearTimeout(timer);
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
        onChange={(lang) => setPrefs({ lang })}
        options={[
          { value: "en", label: "English" },
          { value: "es", label: "Español" },
        ]}
      />

      <h2 className={styles.label}>{t("welcome.textSize")}</h2>
      <SegmentedControl<TextSize>
        ariaLabel={t("welcome.textSize")}
        value={prefs.textSize}
        onChange={(textSize) => setPrefs({ textSize })}
        options={[
          { value: "standard", label: "A", sub: t("welcome.sizeStandard") },
          { value: "large", label: "A+", sub: t("welcome.sizeLarge") },
          { value: "xlarge", label: "A++", sub: t("welcome.sizeXlarge") },
        ]}
      />

      <div className={styles.actions}>
        <Button
          variant="primary"
          fullWidth
          icon="my_location"
          label={t("welcome.showStops")}
          onPress={showStops}
          disabled={asking}
          disabledReason={t("welcome.asking")}
        />
        <Button variant="text" label={t("welcome.notNow")} onPress={finish} />
      </div>
    </main>
  );
}
