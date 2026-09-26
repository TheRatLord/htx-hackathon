// My ticket: the QR code a rider shows the fare reader. The prototype has no accounts (sign-in and
// tickets are METRO's), so every rider sees the same sample code, and the screen says so.

import QRCode from "qrcode";
import { useMemo } from "react";
import { useBack } from "../../app/useBack.ts";
import { usePageTitle } from "../../app/usePageTitle.ts";
import { useT } from "../../i18n/index.ts";
import { AppBar } from "../../ui/AppBar.tsx";
import styles from "./Ticket.module.css";

const SAMPLE_ID = "SAMPLE-0000-0000";
/** Blank modules around the code, which readers need to find it. */
const QUIET = 4;

/** The QR modules as one SVG path of 1x1 squares. */
function qrPath(text: string): { size: number; d: string } {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: "M" });
  let d = "";
  for (let y = 0; y < modules.size; y++)
    for (let x = 0; x < modules.size; x++) if (modules.get(y, x)) d += `M${x + QUIET} ${y + QUIET}h1v1h-1z`;
  return { size: modules.size + 2 * QUIET, d };
}

export default function Ticket() {
  const t = useT();
  usePageTitle(t("fares.ticketTitle"));
  const qr = useMemo(() => qrPath(`RIDEMETRO:${SAMPLE_ID}`), []);

  return (
    <div className={styles.page}>
      <AppBar title={t("fares.ticketTitle")} onBack={useBack()} />
      <div className={styles.body}>
        <p className={styles.sample}>{t("fares.sampleTag")}</p>
        <svg className={styles.qr} viewBox={`0 0 ${qr.size} ${qr.size}`} role="img" aria-label={t("fares.qrLabel")} shapeRendering="crispEdges">
          <rect width={qr.size} height={qr.size} fill="#fff" />
          <path d={qr.d} fill="#000" />
        </svg>
        <p className={styles.id}>{SAMPLE_ID}</p>
        <p className={styles.hint}>{t("fares.qrHint")}</p>
        <p className={styles.note}>{t("fares.sampleNote")}</p>
      </div>
    </div>
  );
}
