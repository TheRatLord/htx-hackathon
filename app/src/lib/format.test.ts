import { describe, expect, it } from 'vitest';
import { formatClock, formatCountdown, formatHour, formatMinuteList } from './format';

describe('format', () => {
  it('formats clock times', () => {
    expect(formatClock(16 * 60 + 46)).toBe('4:46 PM');
    expect(formatClock(0)).toBe('12:00 AM');
    expect(formatClock(12 * 60 + 5)).toBe('12:05 PM');
    expect(formatClock(24 * 60 + 30)).toBe('12:30 AM');
  });

  it('formats hours', () => {
    expect(formatHour(16)).toBe('4 PM');
    expect(formatHour(0)).toBe('12 AM');
    expect(formatHour(12)).toBe('12 PM');
  });

  it('formats countdowns like the current app', () => {
    expect(formatCountdown(0)).toBe('Now');
    expect(formatCountdown(6)).toBe('6 min');
    expect(formatCountdown(65)).toBe('1:05 h');
    expect(formatCountdown(78)).toBe('1:18 h');
  });

  it('formats timetable minutes', () => {
    expect(formatMinuteList([25, 55])).toBe('25 · 55');
    expect(formatMinuteList([5])).toBe('05');
  });
});
