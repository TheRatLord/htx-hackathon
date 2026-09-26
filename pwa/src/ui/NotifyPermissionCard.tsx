import { useState } from "react";
import { useT } from "../i18n/index.ts";
import { requestNotify } from "../lib/notify.ts";
import { Button } from "./Button.tsx";
import styles from "./NotifyPermissionCard.module.css";
import type { NotifyPermissionCardProps } from "./types.ts";

/** C.15: the only place notifications are asked for. Declining blocks nothing. */
export function NotifyPermissionCard({ context, onDone }: NotifyPermissionCardProps) {
  const t = useT();
  const [declined, setDeclined] = useState(false);
  if (declined) return <p className={styles.caption}>{t("notify.declined")}</p>;
  const decline = () => {
    setDeclined(true);
    onDone("declined");
  };
  return (
    <div className={styles.card}>
      <p className={styles.title}>{t(context === "trip" ? "notify.trip" : "notify.stopTrack")}</p>
      <div className={styles.actions}>
        <Button
          variant="tonal"
          icon="notifications"
          label={t("notify.turnOn")}
          onPress={async () => ((await requestNotify()) === "granted" ? onDone("granted") : decline())}
        />
        <Button variant="text" label={t("common.notNow")} onPress={decline} />
      </div>
    </div>
  );
}
