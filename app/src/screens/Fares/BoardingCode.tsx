import QRCode from 'qrcode';

/** Clearly not a real fare: this is what the sample code encodes. */
export const SAMPLE_CODE_TEXT = 'RIDEMETRO-CONCEPT-SAMPLE-NOT-A-VALID-FARE';

/** Quiet zone around the symbol, in modules. Scanners want a light border. */
const QUIET = 2;

/** One SVG path for every dark module, so the DOM stays small. */
export function qrPath(text: string): { size: number; d: string } {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const n = modules.size;
  let d = '';
  for (let y = 0; y < n; y++) {
    let x = 0;
    while (x < n) {
      if (!modules.get(y, x)) {
        x++;
        continue;
      }
      // Merge horizontal runs of dark modules into one rectangle.
      let run = 1;
      while (x + run < n && modules.get(y, x + run)) run++;
      d += `M${x + QUIET} ${y + QUIET}h${run}v1h-${run}z`;
      x += run;
    }
  }
  return { size: n + QUIET * 2, d };
}

const SAMPLE = qrPath(SAMPLE_CODE_TEXT);

/**
 * The boarding code. Always dark modules on white, in light and dark mode,
 * because readers need that contrast.
 */
export function BoardingCode({ id, label = 'Sample boarding code' }: { id?: string; label?: string }) {
  return (
    <svg
      id={id}
      className="fares-code"
      role="img"
      aria-label={label}
      viewBox={`0 0 ${SAMPLE.size} ${SAMPLE.size}`}
      shapeRendering="crispEdges"
    >
      <rect width={SAMPLE.size} height={SAMPLE.size} fill="#ffffff" />
      <path d={SAMPLE.d} fill="#0f1a2e" />
    </svg>
  );
}
