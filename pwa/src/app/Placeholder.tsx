// Stand-ins so every route in G.3 renders before its module fills it in.

import { AppBar } from "../ui/AppBar.tsx";
import { SheetHeader } from "../ui/SheetHeader.tsx";
import { ExploreSheet } from "./layouts/ExploreChrome.tsx";
import styles from "./Placeholder.module.css";
import { useBack } from "./useBack.ts";
import { usePageTitle } from "./usePageTitle.ts";

interface PlaceholderProps {
  title: string;
  todo: string;
}

export function SheetPlaceholder({ title, todo, back = true }: PlaceholderProps & { back?: boolean }) {
  usePageTitle(title);
  const onBack = useBack();
  return (
    <ExploreSheet ariaLabel={title} header={<SheetHeader title={title} />} onBack={back ? onBack : undefined}>
      <p className={styles.todo}>TODO: {todo}</p>
    </ExploreSheet>
  );
}

export function PagePlaceholder({ title, todo }: PlaceholderProps) {
  usePageTitle(title);
  return (
    <>
      <AppBar title={title} onBack={useBack()} />
      <p className={styles.todo}>TODO: {todo}</p>
    </>
  );
}

export function TabPlaceholder({ title, todo }: PlaceholderProps) {
  usePageTitle(title);
  return (
    <>
      <h1 tabIndex={-1} className={styles.title}>
        {title}
      </h1>
      <p className={styles.todo}>TODO: {todo}</p>
    </>
  );
}
