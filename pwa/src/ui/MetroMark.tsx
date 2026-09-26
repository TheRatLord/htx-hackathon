import { useT } from "../i18n/index.ts";

/** The METRO mark (a placeholder wordmark until METRO's official asset replaces public/brand/metro-mark.svg). */
export function MetroMark({ height = 28 }: { height?: number }) {
  const t = useT();
  return <img src="/brand/metro-mark.svg" alt={t("app.metro")} height={height} style={{ display: "block", height, width: "auto" }} />;
}
