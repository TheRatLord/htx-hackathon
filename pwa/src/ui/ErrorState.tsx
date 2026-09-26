import { useLang, useT } from "../i18n/index.ts";
import { errorText } from "../lib/i18nServer.ts";
import { EmptyState } from "./EmptyState.tsx";
import type { ErrorStateProps } from "./types.ts";

/** C.15: always offers "Try again"; the text comes from the error code, never only the server's English. */
export function ErrorState({ error, context, onRetry }: ErrorStateProps) {
  const t = useT();
  const lang = useLang();
  return (
    <EmptyState
      icon="error"
      title={t("error.title")}
      body={errorText(error, context, lang)}
      action={{ label: t("common.tryAgain"), onPress: onRetry, variant: "primary" }}
    />
  );
}
