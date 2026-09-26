import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { initialState } from '../../app/store';
import { renderScreen } from '../../test/renderScreen';
import { SearchScreen } from './SearchScreen';

function setup(state = initialState) {
  const user = userEvent.setup();
  const utils = renderScreen(<SearchScreen />, { hash: '#/search', state });
  const input = screen.getByRole('searchbox', { name: 'Search for a place' });
  return { user, input, ...utils };
}

describe('SearchScreen', () => {
  it('focuses the labelled search field and keeps the map calm', () => {
    const { input, getScene } = setup();
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute('placeholder', 'Where to?');
    expect(getScene().stops ?? []).toHaveLength(0);
    expect(getScene().showControls).toBe(false);
    expect(screen.getByText('Concept with sample data')).toBeInTheDocument();
  });

  it('shows Home and Work quick picks and opens routes to Home', async () => {
    const { user } = setup();
    const home = screen.getByRole('button', { name: /^home/i });
    expect(home).toHaveTextContent('18 min');
    expect(screen.getByRole('button', { name: /^work/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Recent' })).toBeInTheDocument();
    await user.click(home);
    expect(window.location.hash).toBe('#/routes/place-home');
  });

  it('hides removed saved places and skips an empty recent section', () => {
    setup({ ...initialState, hiddenSavedPlaceIds: ['work'], recentPlaceIds: [] });
    expect(screen.getByRole('button', { name: /^home/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^work/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Recent' })).not.toBeInTheDocument();
  });

  it('finds Houston Zoo for "zoo" and opens its routes', async () => {
    const { user, input } = setup({ ...initialState, recentPlaceIds: [] });
    await user.type(input, 'zoo');
    expect(screen.getByRole('heading', { name: 'Places' })).toBeInTheDocument();
    const zoo = screen.getByRole('button', { name: 'Houston Zoo, Hermann Park' });
    expect(zoo.querySelector('mark')).toHaveTextContent('Zoo');
    await user.click(zoo);
    expect(window.location.hash).toBe('#/routes/houston-zoo');
  });

  it('stars a result without navigating', async () => {
    const { user, input } = setup();
    await user.type(input, 'zoo');
    const star = screen.getByRole('button', { name: 'Save Houston Zoo' });
    expect(star).toHaveAttribute('aria-pressed', 'false');
    await user.click(star);
    const saved = screen.getByRole('button', { name: 'Remove Houston Zoo from saved' });
    expect(saved).toHaveAttribute('aria-pressed', 'true');
    expect(window.location.hash).toBe('#/search');
    await user.click(saved);
    expect(screen.getByRole('button', { name: 'Save Houston Zoo' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows starred places as quick picks', () => {
    setup({ ...initialState, starredPlaceIds: ['hermann-park'], recentPlaceIds: [] });
    expect(screen.getByRole('button', { name: /^hermann park/i })).toBeInTheDocument();
  });

  it('shows an empty state for an unknown query', async () => {
    const { user, input } = setup();
    await user.type(input, 'qqq');
    expect(screen.getByText('No places match “qqq”')).toBeInTheDocument();
    expect(screen.getByText(/only knows a few sample places/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /search for zoo/i }));
    expect(input).toHaveValue('zoo');
  });

  it('clears the field with the clear button and with Escape', async () => {
    const { user, input } = setup();
    await user.type(input, 'zoo');
    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();
    await user.type(input, 'museum{Escape}');
    expect(input).toHaveValue('');
  });

  it('opens the first result on Enter', async () => {
    const { user, input } = setup();
    await user.type(input, 'zoo{Enter}');
    expect(window.location.hash).toBe('#/routes/houston-zoo');
  });
});
