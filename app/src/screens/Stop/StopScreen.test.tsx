import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderScreen } from '../../test/renderScreen';
import { StopScreen } from './StopScreen';

async function finishLoading() {
  await act(async () => {
    vi.advanceTimersByTime(600);
  });
}

function setupUser() {
  return userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
}

describe('StopScreen', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it('shows the Wheeler stop with its route, next departures and timetable', async () => {
    renderScreen(<StopScreen stopId="wheeler-bay-f" />, { hash: '#/stop/wheeler-bay-f' });
    await finishLoading();

    expect(screen.getByRole('heading', { level: 1, name: 'Wheeler Transit Center · Bay F' })).toBeInTheDocument();
    expect(screen.getByText('3 min walk')).toBeInTheDocument();
    expect(screen.getByText('1 route')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '5 Eastbound to Richey St' })).toBeInTheDocument();

    const tab = screen.getByRole('tab', { name: /route 5 eastbound/i });
    expect(tab).toHaveAttribute('aria-selected', 'true');

    const departures = within(screen.getByRole('list', { name: 'Next departures' })).getAllByRole('listitem');
    expect(departures).toHaveLength(3);
    expect(departures[0]).toHaveTextContent('6 min');
    expect(departures[0]).toHaveTextContent('Live');
    expect(departures[1]).toHaveTextContent('36 min');
    expect(departures[1]).toHaveTextContent('Scheduled');
    expect(departures[2]).toHaveTextContent('1:05 h');

    expect(screen.getByText('Timetable · Today')).toBeInTheDocument();
    const rows = screen.getAllByRole('row');
    expect(rows[0]).toHaveTextContent('4 PM');
    expect(rows[0]).toHaveTextContent('25 · 55');
    expect(rows[0]).toHaveAttribute('aria-current', 'time');
    expect(rows[5]).toHaveTextContent('9 PM');
    expect(rows[5]).toHaveTextContent('05');
    expect(screen.queryByText(/tracking lost/i)).not.toBeInTheDocument();
  });

  it('marks this stop active among the numbered pins', () => {
    const { getScene } = renderScreen(<StopScreen stopId="fannin-alabama" />);
    const stops = getScene().stops ?? [];
    expect(stops.map((s) => [s.label, s.caption])).toEqual([
      ['1', '3 min'],
      ['2', '4 min'],
      ['3', '6 min'],
    ]);
    expect(stops.filter((s) => s.active).map((s) => s.id)).toEqual(['fannin-alabama']);
  });

  it('opens another stop from its map pin, replacing this one', () => {
    const { getScene } = renderScreen(<StopScreen stopId="wheeler-bay-f" />, { hash: '#/stop/wheeler-bay-f' });
    const before = window.history.length;
    act(() => getScene().onStopClick?.('almeda-tuam'));
    expect(window.location.hash).toBe('#/stop/almeda-tuam');
    expect(window.history.length).toBe(before);
  });

  it('shows the tracking lost banner on the 65 and lets the rider report it', async () => {
    renderScreen(<StopScreen stopId="fannin-alabama" />, { hash: '#/stop/fannin-alabama' });
    await finishLoading();
    const user = setupUser();

    // The 25 is tracked normally: no banner.
    expect(screen.getByRole('tab', { name: /route 25 westbound/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByText(/tracking lost 4 min ago/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /route 65 westbound/i }));
    expect(screen.getByRole('heading', { name: '65 Westbound to Synott Rd' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Tracking lost 4 min ago. These times come from the timetable, so the bus may be early or late.',
      ),
    ).toBeInTheDocument();

    // Without GPS, no departure may claim to be Live.
    const departures = screen.getByRole('list', { name: 'Next departures' });
    expect(within(departures).queryByText('Live')).not.toBeInTheDocument();
    expect(within(departures).getAllByText('Scheduled')).toHaveLength(3);

    await user.click(screen.getByRole('button', { name: /report a problem/i }));
    expect(screen.getByRole('button', { name: /sending/i })).toBeDisabled();
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole('status')).toHaveTextContent('Reported. Thank you.');
    expect(screen.queryByRole('button', { name: /report a problem/i })).not.toBeInTheDocument();

    // Back on the 25: still no banner.
    await user.click(screen.getByRole('tab', { name: /route 25 westbound/i }));
    expect(screen.queryByText(/tracking lost 4 min ago/i)).not.toBeInTheDocument();

    // The report is remembered per tab while on the screen.
    await user.click(screen.getByRole('tab', { name: /route 65 westbound/i }));
    expect(screen.getByText('Reported. Thank you.')).toBeInTheDocument();
  });

  it('moves between route tabs with the arrow keys', async () => {
    renderScreen(<StopScreen stopId="fannin-alabama" />, { hash: '#/stop/fannin-alabama' });
    await finishLoading();
    const user = setupUser();
    const first = screen.getByRole('tab', { name: /route 25/i });
    first.focus();
    await user.keyboard('{ArrowRight}');
    const second = screen.getByRole('tab', { name: /route 65/i });
    expect(second).toHaveAttribute('aria-selected', 'true');
    expect(second).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(first).toHaveAttribute('aria-selected', 'true');
  });

  it('shows an empty state with a way home for an unknown stop', async () => {
    renderScreen(<StopScreen stopId="nowhere" />, { hash: '#/stop/nowhere' });
    const user = setupUser();
    expect(screen.getByText("We can't find this stop")).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /back to home/i }));
    expect(window.location.hash).toBe('#/nearby');
  });
});
