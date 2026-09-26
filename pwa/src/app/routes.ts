// The URL contract (spec G.3): the logical parent of each screen, for "‹ Back" on a cold deep link.

const PARENTS: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^\/explore\/stop\/([^/]+)\/(schedule|walk)$/, (m) => `/explore/stop/${m[1]}`],
  [/^\/explore\/plan\/\d+$/, () => "/explore/plan"],
  [/^\/explore\/.+$/, () => "/explore"],
  [/^\/more\/alerts\/.+$/, () => "/more/alerts"],
  [/^\/more\/.+$/, () => "/more"],
];

export function parentOf(pathname: string): string {
  for (const [re, parent] of PARENTS) {
    const m = pathname.match(re);
    if (m) return parent(m);
  }
  return "/explore";
}

/** Deep links that render without the welcome screen, so a shared link always works (D1). */
export const WELCOME_EXEMPT = [/^\/explore\/stop\//, /^\/explore\/route\//, /^\/explore\/tc\//, /^\/more\/alerts/, /^\/fares/];
