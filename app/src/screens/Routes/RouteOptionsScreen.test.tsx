import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderScreen } from '../../test/renderScreen';
import { RouteOptionsScreen } from './RouteOptionsScreen';

async function finishLoading() {
  await act(async () => {
    vi.advanceTimersByTime(600);
  });
}

function cardOrder(): string[] {
  const list = screen.getByRole('list', { name: 'Route options' });
  return within(list)
    .getAllByRole('button')
    .map((b) => b.getAttribute('data-option') ?? '');
}

function setup(placeId = 'houston-zoo') {
  const utils = renderScreen(<RouteOptionsScreen placeId={placeId} />, { hash: `#/routes/${placeId}` });
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  return { ...utils, user };
}

describe('RouteOptionsScreen', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it('shows the from/to card and skeletons while loading, with no route lines yet', () => {
    const { getScene } = setup();
    expect(screen.getByText('Current location')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /houston zoo/i })).toBeInTheDocument();
    expect(screen.getAllByLabelText('Loading')).toHaveLength(3);
    expect(getScene().routes).toEqual([]);
    expect(getScene().destination?.label).toBe('Houston Zoo');
    expect(screen.getByRole('button', { name: /start trip/i })).toBeDisabled();
  });

  it('draws all three routes on the map with A/B/C badges and A selected', async () => {
    const { getScene } = setup();
    await finishLoading();
    const routes = getScene().routes ?? [];
    expect(routes.map((r) => [r.id, r.badge?.label, r.color, !!r.selected])).toEqual([
      ['A', 'A', 'var(--route-a)', true],
      ['B', 'B', 'var(--route-b)', false],
      ['C', 'C', 'var(--route-c)', false],
    ]);
    for (const r of routes) {
      expect(r.paths.some((p) => p.kind === 'ride')).toBe(true);
      expect(r.paths.some((p) => p.kind === 'walk')).toBe(true);
    }
    // Badges sit at different points so they don't overlap.
    const spots = new Set(routes.map((r) => r.badge?.position.join(',')));
    expect(spots.size).toBe(3);
    expect(getScene().fit?.length).toBeGreaterThan(3);
  });

  it('sorts Fastest as A, B, C and Least walking as B, A, C, keeping the selection', async () => {
    const { user } = setup();
    await finishLoading();
    expect(cardOrder()).toEqual(['A', 'B', 'C']);
    expect(screen.getByRole('radio', { name: 'Fastest' })).toHaveAttribute('aria-checked', 'true');

    await user.click(screen.getByRole('radio', { name: 'Least walking' }));
    expect(cardOrder()).toEqual(['B', 'A', 'C']);
    expect(screen.getByRole('button', { name: /^route a:/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Start trip · Route A' })).toBeInTheDocument();
  });

  it('shows the arrive time, total, tags, leave-by, status and leg pills on a card', async () => {
    setup();
    await finishLoading();
    const a = screen.getByRole('button', { name: /^route a:/i });
    expect(a).toHaveTextContent('Arrive 4:46 PM');
    expect(a).toHaveTextContent('24 min');
    expect(a).toHaveTextContent('Fastest');
    expect(a).toHaveTextContent('Leave by 4:22 PM');
    expect(a).toHaveTextContent('Live');
    const c = screen.getByRole('button', { name: /^route c:/i });
    expect(c).toHaveTextContent('Lost');
    expect(c.getAttribute('aria-label')).toMatch(/transfer, wait 4 min/);
  });

  it('selects option B from its card and highlights it on the map', async () => {
    const { user, getScene } = setup();
    await finishLoading();
    await user.click(screen.getByRole('button', { name: /^route b:/i }));
    expect(screen.getByRole('button', { name: /^route b:/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^route a:/i })).toHaveAttribute('aria-pressed', 'false');
    expect(getScene().routes?.find((r) => r.selected)?.id).toBe('B');
    expect(screen.getByRole('button', { name: 'Start trip · Route B' })).toBeInTheDocument();
  });

  it('selects an option when its line or badge is tapped on the map', async () => {
    const { getScene } = setup();
    await finishLoading();
    act(() => getScene().onRouteClick?.('C'));
    expect(getScene().routes?.find((r) => r.selected)?.id).toBe('C');
    expect(screen.getByRole('button', { name: 'Start trip · Route C' })).toBeInTheDocument();
  });

  it('starts the trip with the selected option', async () => {
    const { user } = setup();
    await finishLoading();
    await user.click(screen.getByRole('button', { name: /^route b:/i }));
    await user.click(screen.getByRole('button', { name: 'Start trip · Route B' }));
    expect(window.location.hash).toBe('#/trip/houston-zoo/B');
  });

  it('stars and unstars the destination', async () => {
    const { user } = setup();
    const star = screen.getByRole('button', { name: 'Save Houston Zoo' });
    expect(star).toHaveAttribute('aria-pressed', 'false');
    await user.click(star);
    expect(star).toHaveAttribute('aria-pressed', 'true');
    await user.click(star);
    expect(star).toHaveAttribute('aria-pressed', 'false');
  });

  it('plans three options for other places too', async () => {
    const { getScene } = setup('mfah');
    await finishLoading();
    expect(getScene().routes?.map((r) => r.badge?.label)).toEqual(['A', 'B', 'C']);
    expect(cardOrder()).toHaveLength(3);
  });

  it('shows an empty state for an unknown place, with a way back to search', async () => {
    const { user, getScene } = setup('nowhere');
    expect(screen.getByText("We couldn't find that place")).toBeInTheDocument();
    expect(getScene().routes).toBeUndefined();
    await user.click(screen.getByRole('button', { name: /search places/i }));
    expect(window.location.hash).toBe('#/search');
  });
});
