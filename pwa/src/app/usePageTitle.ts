import { useEffect } from "react";
import { t } from "../i18n/index.ts";

/** document.title = "<title> · RideMETRO" (C.7). */
export function usePageTitle(title: string): void {
  useEffect(() => {
    document.title = t("app.pageTitle", { title });
  }, [title]);
}
