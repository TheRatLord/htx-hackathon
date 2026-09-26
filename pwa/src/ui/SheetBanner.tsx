import { useT } from "../i18n/index.ts";
import { Button } from "./Button.tsx";
import { Icon } from "./Icon.tsx";
import styles from "./SheetBanner.module.css";
import type { SheetBannerProps } from "./types.ts";

/** C.12: the one banner row inside the home sheet (trip planned > location off > demo). */
export function SheetBanner(props: SheetBannerProps) {
  const t = useT();
  switch (props.kind) {
    case "trip-planned":
      return (
        <div className={styles.trip}>
          <p className={styles.tripText}>{t("banner.tripPlanned", { place: props.place, time: props.leaveAt })}</p>
          <span className={styles.tripActions}>
            <Button variant="text" label={t("common.open")} onPress={props.onOpen} />
            <Button variant="text" label={t("common.clear")} onPress={props.onClear} />
          </span>
        </div>
      );
    case "location-off":
      // Under a saved stop the rider already has what they came for: one row, not the full card.
      if (props.compact)
        return (
          <div className={styles.compact}>
            <p className={styles.compactText}>
              <Icon name="place" color="var(--c-text-variant)" />
              {t("banner.locationOffTitle")}
            </p>
            {!props.blocked && <Button variant="text" label={t("banner.turnOn")} onPress={props.onTurnOn} />}
            {props.blocked && <p className={styles.steps}>{t("banner.chromeSteps")}</p>}
          </div>
        );
      return (
        <div className={styles.card}>
          <p className={styles.title}>
            <Icon name="place" color="var(--c-text-variant)" />
            {t("banner.locationOffTitle")}
          </p>
          <p>{props.reason === "unavailable" ? t("banner.locationUnavailableBody") : t("banner.locationOffBody")}</p>
          {props.blocked ? (
            <p className={styles.steps}>{t("banner.chromeSteps")}</p>
          ) : (
            <Button variant="primary" fullWidth label={t("banner.turnOnLocation")} onPress={props.onTurnOn} />
          )}
          <Button variant="outline" fullWidth label={t("banner.searchPlace")} onPress={props.onSearch} />
        </div>
      );
    case "demo":
      return <p className={styles.demo}>{props.text}</p>;
  }
}
