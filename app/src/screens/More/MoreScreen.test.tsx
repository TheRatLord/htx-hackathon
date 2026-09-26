import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initialState, type AppState } from '../../app/store';
import { renderScreen } from '../../test/renderScreen';
import { EXIT_MS } from '../Recent/lists';
import { MoreScreen } from './MoreScreen';

const state: AppState = {
  ...initialState,
  starredPlaceIds: ['mfah'],
  savedTrips: [
    { id: 't1', placeId: 'houston-zoo', optionId: 'C', summary: 'Route 700 + 65 · 34 min', savedAt: 0 },
    { id: 't2', placeId: 'heb-midtown', optionId: 'A', summary: 'Route 25 · 14 min', savedAt: 1 },
  ],
};

describe('MoreScreen', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => {
    vi.useRealTimers();
    document.documentElement.removeAttribute('data-theme');
  });

  const setup = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  /** Let the collapse animation finish so the removal is committed. */
  const settle = () =>
    act(async () => {
      vi.advanceTimersByTime(EXIT_MS + 50);
    });
  const section = (name: string) => screen.getByRole('region', { name });

  it('lists saved places, starred places and saved trips', () => {
    renderScreen(<MoreScreen />, { state, hash: '#/more' });
    expect(screen.getByRole('heading', { level: 1, name: 'More' })).toBeInTheDocument();
    const places = section('Saved places');
    expect(within(places).getByText('These show as one-tap chips on the map.')).toBeInTheDocument();
    const rows = within(places).getAllByRole('listitem');
    expect(rows.map((r) => r.querySelector('.rl-row__title')?.textContent)).toEqual([
      'Home',
      'Work',
      'Museum of Fine Arts',
    ]);
    expect(rows[0]).toHaveTextContent('Saved place');
    expect(rows[0]).toHaveTextContent('Montrose · sample address');
    expect(within(section('Saved trips')).getAllByRole('listitem')).toHaveLength(2);
  });

  it('removes Home and offers to restore it', async () => {
    renderScreen(<MoreScreen />, { state });
    const user = setup();
    expect(screen.queryByRole('button', { name: /restore/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove Home' }));
    await settle();
    expect(screen.queryByRole('button', { name: 'Remove Home' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Work' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Restore Home' }));
    expect(screen.getByRole('button', { name: 'Remove Home' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /restore/i })).not.toBeInTheDocument();
  });

  it('shows an empty state with Restore Home and Work when nothing is saved', async () => {
    renderScreen(<MoreScreen />, { state: { ...state, starredPlaceIds: [] } });
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Remove Home' }));
    await settle();
    await user.click(screen.getByRole('button', { name: 'Remove Work' }));
    await settle();
    expect(screen.getByText('No saved places')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Restore Home and Work' }));
    expect(within(section('Saved places')).getAllByRole('listitem')).toHaveLength(2);
  });

  it('removes a starred place', async () => {
    renderScreen(<MoreScreen />, { state });
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Remove Museum of Fine Arts' }));
    await settle();
    expect(within(section('Saved places')).queryByText('Museum of Fine Arts')).not.toBeInTheDocument();
    expect(within(section('Saved places')).getAllByRole('listitem')).toHaveLength(2);
  });

  it('removes a saved trip, then shows the empty state', async () => {
    renderScreen(<MoreScreen />, { state });
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Remove trip to Houston Zoo' }));
    await settle();
    const trips = section('Saved trips');
    expect(within(trips).getAllByRole('listitem')).toHaveLength(1);
    expect(within(trips).queryByText('Houston Zoo')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remove trip to H-E-B' }));
    await settle();
    expect(within(trips).getByText('Tap Save trip on a trip to keep it here.')).toBeInTheDocument();
  });

  it('opens a saved trip', async () => {
    renderScreen(<MoreScreen />, { state });
    const user = setup();
    await user.click(within(section('Saved trips')).getByRole('button', { name: /^houston zoo/i }));
    expect(window.location.hash).toBe('#/trip/houston-zoo/C');
  });

  it('switches the theme', async () => {
    renderScreen(<MoreScreen />, { state });
    const user = setup();
    const theme = screen.getByRole('radiogroup', { name: 'Theme' });
    expect(within(theme).getByRole('radio', { name: 'System' })).toHaveAttribute('aria-checked', 'true');
    expect(document.documentElement).not.toHaveAttribute('data-theme');

    await user.click(within(theme).getByRole('radio', { name: 'Dark' }));
    expect(within(theme).getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');

    await user.click(within(theme).getByRole('radio', { name: 'Light' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });

  it('resets the sample data to its defaults', async () => {
    const emptied: AppState = {
      ...initialState,
      savedTrips: [],
      starredPlaceIds: [],
      hiddenSavedPlaceIds: ['home', 'work'],
      theme: 'dark',
    };
    renderScreen(<MoreScreen />, { state: emptied });
    const user = setup();
    expect(screen.getByText('No saved places')).toBeInTheDocument();
    expect(screen.getByText('No saved trips')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reset sample data' }));
    expect(screen.getByText('Sample data restored.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Home' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Work' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove trip to Houston Zoo' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'System' })).toHaveAttribute('aria-checked', 'true');
    expect(document.documentElement).not.toHaveAttribute('data-theme');
  });
});
