import { Link } from "react-router";
import { useT } from "../i18n/index.ts";
import styles from "./Button.module.css";
import { Icon } from "./Icon.tsx";
import type { ButtonProps } from "./types.ts";

/** C.10. One `primary` per screen state; everything else is tonal, outline or text. */
export function Button({ variant, label, icon, onPress, disabled, disabledReason, fullWidth, href, external, externalLabel, pressed, ariaLabel }: ButtonProps) {
  const t = useT();
  const className = [styles.button, styles[variant], fullWidth && styles.full].filter(Boolean).join(" ");
  const name = external ? `${ariaLabel ?? label} ${externalLabel ?? t("common.opensRideMetro")}` : ariaLabel;
  const content = (
    <>
      {icon && <Icon name={icon} />}
      <span>{label}</span>
      {external && <Icon name="north_east" size={20} />}
    </>
  );
  let control;
  if (href && !disabled && external) {
    control = (
      <a className={className} href={href} target="_blank" rel="noopener noreferrer" aria-label={name} onClick={onPress}>
        {content}
      </a>
    );
  } else if (href && !disabled) {
    control = (
      <Link className={className} to={href} aria-label={name} onClick={onPress}>
        {content}
      </Link>
    );
  } else {
    control = (
      <button type="button" className={className} onClick={onPress} disabled={disabled} aria-pressed={pressed} aria-label={name}>
        {content}
      </button>
    );
  }
  if (!disabled || !disabledReason) return control;
  return (
    <div className={styles.withReason}>
      {control}
      <p className={styles.reason}>{disabledReason}</p>
    </div>
  );
}
