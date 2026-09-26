import { Outlet } from "react-router";
import styles from "./Frame.module.css";

/** A scroll area over the (hidden) map, on the page background; the screen renders its own AppBar or title. */
export function Frame() {
  return (
    <main className={styles.scroll}>
      <Outlet />
    </main>
  );
}
