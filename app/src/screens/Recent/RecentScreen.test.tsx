import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initialState, type AppState } from '../../app/store';
import { renderScreen } from '../../test/renderScreen';
import { RecentScreen } from './RecentScreen';

const state: AppState = {
  ...initialState,
  recentPlaceIds: ['houston-zoo', 'unknown-place', 'mfah'],
  savedTrips: [
    { id: 't1', placeId: 'houston-zoo', optionId: 'C', summary: 'Route 700 + 65 · 34 min', savedAt: 0 },
    { id: 't2', placeId: 'mfah', optionId: 'A', summary: 'Route 5 · 18 min', savedAt: 1 },
  ],
};

describe('RecentScreen', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  const setup = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  const load = () =>
    act(async () => {
      vi.advanceTimersByTime(600);
    });
  const section = (name: string) => screen.getByRole('region', { name });

  it('shows a loading state, then recent destinations and saved trips', async () => {
    renderScreen(<RecentScreen />, { state, hash: '#/recent' });
    expect(screen.getByRole('heading', { level: 1, name: 'Recent' })).toBeInTheDocument();
    expect(screen.getAllByLabelText('Loading').length).toBeGreaterThan(0);
    await load();
    expect(screen.queryByLabelText('Loading')).not.toBeInTheDocument();

    const recents = within(section('Recent destinations')).getAllByRole('listitem');
    expect(recents).toHaveLength(2); // the unknown id is skipped
    expect(recents[0]).toHaveTextContent('Houston Zoo');
    expect(recents[0]).toHaveTextContent('Hermann Park');
    expect(recents[1]).toHaveTextContent('Museum of Fine Arts');

    const trips = within(section('Saved trips')).getAllByRole('listitem');
    expect(trips).toHaveLength(2);
    expect(trips[0]).toHaveTextContent('Houston Zoo');
    expect(trips[0]).toHaveTextContent('Route 700 + 65 · 34 min');
    expect(screen.getByText('Concept with sample data')).toBeInTheDocument();
  });

  it('clears recents and shows the empty state', async () => {
    renderScreen(<RecentScreen />, { state });
    await load();
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Clear recent destinations' }));
    const recents = section('Recent destinations');
    expect(within(recents).queryAllByRole('listitem')).toHaveLength(0);
    expect(within(recents).getByText('Places you plan trips to show up here.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument();
    // Saved trips are untouched.
    expect(within(section('Saved trips')).getAllByRole('listitem')).toHaveLength(2);

    await user.click(within(recents).getByRole('button', { name: 'Plan a trip' }));
    expect(window.location.hash).toBe('#/search');
  });

  it('opens route options for a recent destination', async () => {
    renderScreen(<RecentScreen />, { state });
    await load();
    const user = setup();
    await user.click(within(section('Recent destinations')).getByRole('button', { name: /museum of fine arts/i }));
    expect(window.location.hash).toBe('#/routes/mfah');
  });

  it('opens the trip for a saved trip', async () => {
    renderScreen(<RecentScreen />, { state });
    await load();
    const user = setup();
    await user.click(within(section('Saved trips')).getByRole('button', { name: /houston zoo/i }));
    expect(window.location.hash).toBe('#/trip/houston-zoo/C');
  });

  it('shows empty states when nothing is recent or saved', async () => {
    renderScreen(<RecentScreen />, { state: { ...initialState, recentPlaceIds: [], savedTrips: [] } });
    await load();
    expect(screen.getByText('No recent destinations')).toBeInTheDocument();
    expect(screen.getByText('Tap Save trip on a trip to keep it here.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Plan a trip' })).toBeInTheDocument();
  });
});
