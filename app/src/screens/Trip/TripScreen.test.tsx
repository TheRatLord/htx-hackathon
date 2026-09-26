import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initialState, type AppState } from '../../app/store';
import { renderScreen } from '../../test/renderScreen';
import { TripScreen } from './TripScreen';

const HASH = '#/trip/houston-zoo/C';
const noSaved: AppState = { ...initialState, savedTrips: [] };

async function finishLoading() {
  await act(async () => {
    vi.advanceTimersByTime(600);
  });
}

describe('TripScreen', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it('shows arrival, total time and leave-by in the header', () => {
    renderScreen(<TripScreen placeId="houston-zoo" optionId="C" />, { hash: HASH });
    expect(screen.getByRole('heading', { level: 1, name: 'Arrive 4:56 PM' })).toBeInTheDocument();
    expect(screen.getByText(/34 min/)).toBeInTheDocument();
    expect(screen.getByText(/To Houston Zoo · Leave by/)).toHaveTextContent('To Houston Zoo · Leave by 4:22 PM');
  });

  it('lists every step after loading, with the tracking lost note', async () => {
    renderScreen(<TripScreen placeId="houston-zoo" optionId="C" />, { hash: HASH });
    expect(screen.getByLabelText('Loading trip steps')).toBeInTheDocument();
    await finishLoading();
    expect(screen.getByText('Walk 6 min')).toBeInTheDocument();
    expect(screen.getByText('Board the 700 Outbound')).toBeInTheDocument();
    expect(screen.getByText('Leaves 4:28 PM · in 9 min')).toBeInTheDocument();
    expect(screen.getByText('Ride 8 min · get off at Almeda Rd @ Binz St')).toBeInTheDocument();
    expect(screen.getByText('Transfer to the 65')).toBeInTheDocument();
    expect(screen.getByText('Wait 4 min at Almeda Rd @ Binz St')).toBeInTheDocument();
    expect(screen.getByText('Board the 65 Westbound')).toBeInTheDocument();
    expect(
      screen.getByText('Tracking lost. Scheduled time shown; the bus may be early or late.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Arrive at Houston Zoo')).toBeInTheDocument();
  });

  it('draws only the selected route, with its letter badge and the destination', () => {
    const { getScene } = renderScreen(<TripScreen placeId="houston-zoo" optionId="C" />, { hash: HASH });
    const scene = getScene();
    expect(scene.routes).toHaveLength(1);
    const [route] = scene.routes!;
    expect(route).toMatchObject({ id: 'C', color: 'var(--route-c)', selected: true, badge: { label: 'C' } });
    expect(route.paths.map((p) => p.kind)).toEqual(['walk', 'ride', 'ride', 'walk']);
    expect(scene.destination?.label).toBe('Houston Zoo');
  });

  it('saves the trip and toggles it off again', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderScreen(<TripScreen placeId="houston-zoo" optionId="C" />, { hash: HASH, state: noSaved });
    const save = screen.getByRole('button', { name: 'Save trip' });
    expect(save).toHaveAttribute('aria-pressed', 'false');
    await user.click(save);
    const saved = screen.getByRole('button', { name: 'Saved' });
    expect(saved).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('status')).toHaveTextContent(/trip saved/i);
    const stored = JSON.parse(window.localStorage.getItem('ridemetro-concept:v1') ?? '{}') as AppState;
    expect(stored.savedTrips).toEqual([
      expect.objectContaining({
        id: 'trip-houston-zoo-C',
        placeId: 'houston-zoo',
        optionId: 'C',
        summary: 'Route 700 + 65 · 34 min',
      }),
    ]);
    await user.click(saved);
    expect(screen.getByRole('button', { name: 'Save trip' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows the sample saved trip as already saved', () => {
    renderScreen(<TripScreen placeId="houston-zoo" optionId="C" />, { hash: HASH });
    expect(screen.getByRole('button', { name: 'Saved' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('starts the trip, then ends it and goes home', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderScreen(<TripScreen placeId="houston-zoo" optionId="C" />, { hash: HASH, state: noSaved });
    await finishLoading();
    expect(screen.queryByText('Trip in progress')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Start trip' }));
    expect(screen.getByText('Trip in progress')).toBeInTheDocument();
    expect(screen.getByText('Walk 6 min').closest('li')).toHaveAttribute('aria-current', 'step');
    await user.click(screen.getByRole('button', { name: 'End trip' }));
    expect(window.location.hash).toBe('#/');
  });

  it('shows End trip straight away when this trip is already active', () => {
    renderScreen(<TripScreen placeId="houston-zoo" optionId="C" />, {
      hash: HASH,
      state: { ...noSaved, activeTrip: { placeId: 'houston-zoo', optionId: 'C' } },
    });
    expect(screen.getByRole('button', { name: 'End trip' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start trip' })).not.toBeInTheDocument();
  });

  it('shows an empty state for an unknown option', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { getScene } = renderScreen(<TripScreen placeId="houston-zoo" optionId="Z" />, {
      hash: '#/trip/houston-zoo/Z',
    });
    expect(screen.getByText("We can't find this trip")).toBeInTheDocument();
    expect(getScene().routes ?? []).toHaveLength(0);
    await user.click(screen.getByRole('button', { name: 'Back to Home' }));
    expect(window.location.hash).toBe('#/');
  });
});
