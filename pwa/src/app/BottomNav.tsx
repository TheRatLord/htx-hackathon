import { Link, useLocation } from "react-router";
import { useT } from "../i18n/index.ts";
import { Icon, type IconName } from "../ui/Icon.tsx";
import styles from "./BottomNav.module.css";
import { lastExploreUrl } from "./lastExplore.ts";

const TABS: { key: string; base: string; icon: IconName }[] = [
  { key: "explore", base: "/explore", icon: "map_pin" },
  { key: "fares", base: "/fares", icon: "tickets" },
  { key: "recent", base: "/recent", icon: "bus_stop" },
  { key: "more", base: "/more", icon: "menu" },
];

/** Explore | Fares | Recent | More, as today. Visible on every screen except Welcome. */
export function BottomNav() {
  const t = useT();
  const { pathname } = useLocation();
  return (
    <nav className={styles.nav} aria-label={t("nav.label")}>
      {TABS.map((tab) => {
        const active = pathname === tab.base || pathname.startsWith(`${tab.base}/`);
        // Explore returns to the sub-screen the rider left; tapped again it goes home.
        const to = tab.key === "explore" && !active ? lastExploreUrl() : tab.base;
        return (
          <Link key={tab.key} to={to} className={styles.tab} aria-current={active ? "page" : undefined}>
            <span className={styles.pill}>
              <Icon name={tab.icon} />
            </span>
            <span className={styles.label}>{t(`nav.${tab.key}`)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
