import { useT } from "../i18n/index.ts";
import { Icon } from "./Icon.tsx";
import styles from "./RouteBadge.module.css";
import type { RouteBadgeProps } from "./types.ts";

/** C.1: the route chip with the coloured top band (navy for bus, the line colour for rail). */
export function RouteBadge({ route, size, selected, showIcon, onPress, ariaLabel }: RouteBadgeProps) {
  const t = useT();
  const label = ariaLabel ?? t(route.mode === "rail" ? "routeName.railA11y" : "routeName.a11y", { name: route.name });
  const className = [styles.badge, styles[size], showIcon && styles.withIcon].filter(Boolean).join(" ");
  const body = (
    <>
      {size !== "lg" && <span className={styles.band} style={{ background: route.color }} />}
      {showIcon && <Icon name={route.mode === "rail" ? "tram" : "directions_bus"} size={18} />}
      <span className={styles.name}>{route.name}</span>
      {selected && (
        <span className={styles.check}>
          <Icon name="check" size={14} />
        </span>
      )}
    </>
  );
  const style = size === "lg" ? { background: route.color } : ({ ["--route-color" as string]: route.color } as const);
  if (onPress) {
    return (
      <button type="button" className={className} style={style} aria-pressed={selected ?? false} aria-label={label} onClick={onPress}>
        {body}
      </button>
    );
  }
  return (
    <span className={className} style={style} role="img" aria-label={label}>
      {body}
    </span>
  );
}
