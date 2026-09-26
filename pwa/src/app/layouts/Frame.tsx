import { Outlet } from "react-router";
import styles from "./Frame.module.css";

/** A scroll area over the (hidden) map; the screen renders its own AppBar or title. */
export function Frame({ background }: { background: "surface" | "background" }) {
  return (
    <main className={`${styles.scroll} ${styles[background]}`}>
      <Outlet />
    </main>
  );
}
