import { Outlet } from "react-router";
import { BottomNav } from "../BottomNav.tsx";
import { useFocusOnNavigate } from "../focus.ts";
import styles from "./Frame.module.css";

/** A scroll area plus the bottom nav; the screen renders its own AppBar or title. */
export function Frame({ background }: { background: "surface" | "background" }) {
  useFocusOnNavigate();
  return (
    <div className={styles.root}>
      <main className={`${styles.scroll} ${styles[background]}`}>
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
