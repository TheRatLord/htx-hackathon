import type { ReactNode } from 'react';
import { ConceptLabel } from './ui';
import './Page.css';

/** Full-screen glass page used by the Fares, Recent and More tabs. */
export function Page({
  title,
  action,
  children,
  withTabBar = true,
}: {
  title: string;
  /** Right side of the title row (e.g. "Works offline"). */
  action?: ReactNode;
  children: ReactNode;
  withTabBar?: boolean;
}) {
  return (
    <div className={`page screen-enter ${withTabBar ? 'page--tabbar' : ''}`}>
      <header className="page__header">
        <h1 className="t-display">{title}</h1>
        {action}
      </header>
      <div className="page__body">{children}</div>
      <footer className="page__footer">
        <ConceptLabel />
      </footer>
    </div>
  );
}
