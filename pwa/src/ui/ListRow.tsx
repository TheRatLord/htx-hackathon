import { Link } from "react-router";
import { Icon } from "./Icon.tsx";
import styles from "./ListRow.module.css";
import type { ListRowProps } from "./types.ts";

/** C.15: a 56dp list row; chevron for in-app, north-east arrow for external links. */
export function ListRow({ label, value, kind, onPress, href, checked, disabled, sub, leading }: ListRowProps) {
  const content = (
    <>
      {leading}
      {kind === "radio" && <span className={styles.radio} data-checked={checked} aria-hidden="true" />}
      <span className={styles.text}>
        <span>{label}</span>
        {sub && <span className={styles.sub}>{sub}</span>}
      </span>
      {value && <span className={styles.value}>{value}</span>}
      {kind === "internal" && <Icon name="chevron_right" color="var(--c-text-variant)" />}
      {kind === "external" && <Icon name="north_east" color="var(--c-text-variant)" />}
      {kind === "toggle" && <span className={styles.toggle} data-checked={checked} aria-hidden="true" />}
    </>
  );
  if (href && !disabled) {
    return kind === "external" ? (
      <a className={styles.row} href={href} target="_blank" rel="noopener noreferrer" onClick={onPress}>
        {content}
      </a>
    ) : (
      <Link className={styles.row} to={href} onClick={onPress}>
        {content}
      </Link>
    );
  }
  const role = kind === "radio" ? "radio" : kind === "toggle" ? "switch" : undefined;
  return (
    <button type="button" className={styles.row} role={role} aria-checked={role ? Boolean(checked) : undefined} disabled={disabled} onClick={onPress}>
      {content}
    </button>
  );
}
