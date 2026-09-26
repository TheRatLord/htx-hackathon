import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderScreen } from '../../test/renderScreen';
import { HomeScreen } from './HomeScreen';

describe('HomeScreen', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it('shows Where to?, Home/Work chips and the concept label', () => {
    renderScreen(<HomeScreen />);
    expect(screen.getByRole('button', { name: /where to\?/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /home/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /work/i })).toBeInTheDocument();
    expect(screen.getByText('Concept with sample data')).toBeInTheDocument();
  });

  it('puts numbered stop pins on the map by distance', () => {
    const { getScene } = renderScreen(<HomeScreen />);
    expect(getScene().stops?.map((s) => [s.label, s.caption])).toEqual([
      ['1', '3 min'],
      ['2', '4 min'],
      ['3', '6 min'],
    ]);
  });

  it('lists nearby stops after loading and opens a stop', async () => {
    renderScreen(<HomeScreen sheet="half" />);
    await act(async () => {
      vi.advanceTimersByTime(600);
    });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByRole('button', { name: /wheeler transit center/i }));
    expect(window.location.hash).toBe('#/stop/wheeler-bay-f');
  });
});
