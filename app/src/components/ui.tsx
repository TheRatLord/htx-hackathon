import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { LINES } from '../data/sampleData';
import type { LineId, TimeStatus } from '../data/types';
import { STATUS_DESCRIPTION, STATUS_LABEL } from '../lib/format';
import { Icon, type IconName } from './Icon';
import './ui.css';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/* Route number card: white card with a coloured top band, like the current app. */
export function RouteBadge({ lineId, size = 'md' }: { lineId: LineId; size?: 'sm' | 'md' | 'lg' }) {
  const line = LINES[lineId];
  return (
    <span
      className={cx('route-badge', `route-badge--${size}`)}
      style={{ ['--band' as string]: lineId === '700' ? 'var(--line-700)' : line.color }}
      aria-label={`Route ${lineId}`}
      role="img"
    >
      <span aria-hidden="true">{lineId}</span>
    </span>
  );
}

/* Live / Scheduled / Tracking lost tag. Shown on every time. */
export function StatusTag({
  status,
  variant = 'plain',
  short = false,
}: {
  status: TimeStatus;
  /** "plain" for light surfaces, "on-accent" for the blue departures strip. */
  variant?: 'plain' | 'on-accent' | 'pill';
  /** "Lost" instead of "Tracking lost", for tight cards. */
  short?: boolean;
}) {
  const text = status === 'lost' && short ? 'Lost' : STATUS_LABEL[status];
  return (
    <span
      className={cx('status-tag', `status-tag--${status}`, `status-tag--${variant}`)}
      title={STATUS_DESCRIPTION[status]}
    >
      <span className="status-tag__dot" aria-hidden="true" />
      <span className="status-tag__text">{text}</span>
      <span className="sr-only">. {STATUS_DESCRIPTION[status]}</span>
    </span>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger-ghost';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'md' | 'lg';
  icon?: IconName;
  iconFilled?: boolean;
  block?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconFilled,
  block,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx('btn', `btn--${variant}`, `btn--${size}`, block && 'btn--block', className)}
      {...rest}
    >
      {icon && <Icon name={icon} size={size === 'lg' ? 22 : 20} filled={iconFilled} />}
      {children && <span>{children}</span>}
    </button>
  );
}

/** Round icon-only button (back, close, zoom). Needs a label for screen readers. */
export function IconButton({
  icon,
  label,
  className,
  glass = true,
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; label: string; glass?: boolean }) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cx('icon-btn', glass && 'glass-strong', className)}
      {...rest}
    >
      <Icon name={icon} size={24} />
    </button>
  );
}

/** Pill chip (Home 15 min, Work 12 min, Saved). */
export function Chip({
  icon,
  iconFilled,
  label,
  meta,
  selected,
  className,
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: IconName;
  iconFilled?: boolean;
  label: string;
  meta?: string;
  selected?: boolean;
}) {
  return (
    <button
      type={type}
      className={cx('chip', 'glass-strong', selected && 'chip--selected', className)}
      aria-pressed={selected}
      {...rest}
    >
      {icon && <Icon name={icon} size={20} filled={iconFilled} />}
      <span className="chip__label">{label}</span>
      {meta && <span className="chip__meta tabular">{meta}</span>}
    </button>
  );
}

/** Two or more mutually exclusive options (Fastest / Least walking). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          className={cx('segmented__opt', o.value === value && 'segmented__opt--on')}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Small note that the app runs on made-up data. Required on every screen. */
export function ConceptLabel({ className }: { className?: string }) {
  return (
    <p className={cx('concept-label', className)}>
      <Icon name="info" size={14} />
      <span>Concept with sample data</span>
    </p>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: IconName;
  title: string;
  body?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon">
        <Icon name={icon} size={28} />
      </span>
      <p className="empty-state__title">{title}</p>
      {body && <p className="empty-state__body">{body}</p>}
      {action}
    </div>
  );
}

/** Shimmering placeholder rows for loading states. */
export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="skeleton" aria-busy="true" aria-label="Loading">
      {Array.from({ length: lines }, (_, i) => (
        <span key={i} className="skeleton__line" style={{ width: `${88 - i * 14}%` }} />
      ))}
    </div>
  );
}

/** Section heading in small caps ("PLACES", "TIMETABLE · TODAY"). */
export function Overline({ children, as: As = 'h2' }: { children: ReactNode; as?: 'h2' | 'h3' | 'p' }) {
  return <As className="t-overline overline">{children}</As>;
}
