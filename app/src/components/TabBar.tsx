import { tabOf, useRouter, type Route, type Tab } from '../app/router';
import { Icon, type IconName } from './Icon';
import './TabBar.css';

const TABS: { id: Tab; label: string; icon: IconName; to: Route }[] = [
  { id: 'trip', label: 'Trip', icon: 'pin', to: { name: 'home' } },
  { id: 'fares', label: 'Fares', icon: 'qr', to: { name: 'fares' } },
  { id: 'recent', label: 'Recent', icon: 'clock', to: { name: 'recent' } },
  { id: 'more', label: 'More', icon: 'menu', to: { name: 'more' } },
];

/** Floating capsule tab bar. The highlight slides to the active tab. */
export function TabBar() {
  const { route, navigate } = useRouter();
  const active = tabOf(route);
  const activeIndex = TABS.findIndex((t) => t.id === active);
  return (
    <nav className="tabbar glass-strong" aria-label="Main">
      <span className="tabbar__indicator" style={{ transform: `translateX(${activeIndex * 100}%)` }} aria-hidden="true" />
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`tabbar__tab ${t.id === active ? 'tabbar__tab--active' : ''}`}
          aria-current={t.id === active ? 'page' : undefined}
          onClick={() => navigate(t.to)}
        >
          <Icon name={t.icon} size={24} />
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
