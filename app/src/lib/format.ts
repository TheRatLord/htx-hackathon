import type { ClockMinutes, TimeStatus } from '../data/types';

/** 16*60+46 -> "4:46 PM" */
export function formatClock(mins: ClockMinutes): string {
  const m = ((Math.round(mins) % 1440) + 1440) % 1440;
  const h24 = Math.floor(m / 60);
  const mm = m % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(mm).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`;
}

/** 16 -> "4 PM" */
export function formatHour(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12} ${h < 12 ? 'AM' : 'PM'}`;
}

/**
 * Countdown in the app's existing style: "Now", "6 min", "1:05 h".
 */
export function formatCountdown(inMinutes: number): string {
  if (inMinutes <= 0) return 'Now';
  if (inMinutes < 60) return `${inMinutes} min`;
  const h = Math.floor(inMinutes / 60);
  const m = inMinutes % 60;
  return `${h}:${String(m).padStart(2, '0')} h`;
}

/** Minute list for a timetable row: [5] -> "05", [25, 55] -> "25 · 55" */
export function formatMinuteList(minutes: number[]): string {
  return minutes.map((m) => String(m).padStart(2, '0')).join(' · ');
}

export const STATUS_LABEL: Record<TimeStatus, string> = {
  live: 'Live',
  scheduled: 'Scheduled',
  lost: 'Tracking lost',
};

/** Longer text for screen readers. */
export const STATUS_DESCRIPTION: Record<TimeStatus, string> = {
  live: 'Live: tracked by GPS',
  scheduled: 'Scheduled: from the timetable, bus not tracked',
  lost: 'Tracking lost: scheduled time shown, bus may be early or late',
};
