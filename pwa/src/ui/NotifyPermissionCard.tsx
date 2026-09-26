import { useState } from "react";
import { useT } from "../i18n/index.ts";
import { notifyPermission, requestNotify } from "../lib/notify.ts";
import { markNotifyAsked, wasNotifyAsked } from "../state/notifyAsked.ts";
import { Button } from "./Button.tsx";
import styles from "./NotifyPermissionCard.module.css";
import type { NotifyPermissionCardProps } from "./types.ts";

/**
 * C.15: the only place notifications are asked for, at most once per context (remembered across
 * visits). Renders nothing when already asked, once allowed, or when the browser has nothing to
 * ask. Declining blocks nothing.
 */
export function NotifyPermissionCard({ context, onDone }: NotifyPermissionCardProps) {
  const t = useT();
  const [askable] = useState(() => !wasNotifyAsked(context) && notifyPermission() === "default");
  const [result, setResult] = useState<"granted" | "declined">();
  if (!askable || result === "granted") return null;
  if (result === "declined") return <p className={styles.caption}>{t("notify.declined")}</p>;
  const finish = (r: "granted" | "declined") => {
    markNotifyAsked(context, r);
    setResult(r);
    onDone?.(r);
  };
  return (
    <div className={styles.card}>
      <p className={styles.title}>{t(context === "trip" ? "notify.trip" : "notify.stopTrack")}</p>
      <div className={styles.actions}>
        <Button
          variant="tonal"
          icon="notifications"
          label={t("notify.turnOn")}
          onPress={async () => finish((await requestNotify()) === "granted" ? "granted" : "declined")}
        />
        <Button variant="text" label={t("common.notNow")} onPress={() => finish("declined")} />
      </div>
    </div>
  );
}
