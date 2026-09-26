import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderScreen } from '../../test/renderScreen';
import { FaresScreen } from './FaresScreen';
import { SAMPLE_CODE_TEXT, qrPath } from './BoardingCode';

describe('FaresScreen', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  const setup = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

  it('shows the sample boarding code with its label and disclaimer', () => {
    renderScreen(<FaresScreen />, { hash: '#/fares' });
    expect(screen.getByRole('heading', { level: 1, name: 'Fares' })).toBeInTheDocument();
    expect(screen.getByText('Works offline')).toBeInTheDocument();
    const code = screen.getByRole('img', { name: 'Sample boarding code' });
    expect(code.querySelector('path')?.getAttribute('d')).toMatch(/^M\d/);
    expect(screen.getByText('Sample code for design only. Not a valid fare code.')).toBeInTheDocument();
    expect(screen.getByText('Hold flat against the reader')).toBeInTheDocument();
    expect(screen.getByText(/face id opens this pass/i)).toBeInTheDocument();
    expect(screen.getByText('Concept with sample data')).toBeInTheDocument();
  });

  it('encodes an obviously fake sample, with a quiet zone', () => {
    expect(SAMPLE_CODE_TEXT).toMatch(/SAMPLE-NOT-A-VALID-FARE/);
    const { size, d } = qrPath(SAMPLE_CODE_TEXT);
    // Version 3 (29 modules) plus a 2-module quiet zone on each side.
    expect(size).toBe(33);
    expect(d.startsWith('M2 2')).toBe(true);
  });

  it('enlarges and shrinks the code', async () => {
    renderScreen(<FaresScreen />);
    const user = setup();
    const toggle = screen.getByRole('button', { name: /trouble scanning\? enlarge code/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    const code = screen.getByRole('img', { name: 'Sample boarding code' });
    expect(toggle).toHaveAttribute('aria-controls', code.id);

    await user.click(toggle);
    expect(toggle).toHaveTextContent('Shrink code');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await user.click(screen.getByRole('button', { name: 'Shrink code' }));
    expect(toggle).toHaveTextContent('Trouble scanning? Enlarge code');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows free ride progress of 7 of 10 after loading', async () => {
    renderScreen(<FaresScreen />);
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(600);
    });
    const bar = screen.getByRole('progressbar', { name: 'Free ride progress' });
    expect(bar).toHaveAttribute('aria-valuenow', '7');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '10');
    expect(screen.getByText('7 of 10 rides')).toBeInTheDocument();
    expect(screen.getByText('3 more rides to a free trip')).toBeInTheDocument();
  });

  it('explains that wallet passes are out of scope', async () => {
    renderScreen(<FaresScreen />);
    const user = setup();
    expect(screen.queryByText(/wallet passes aren't part of this concept/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add to Wallet' }));
    expect(screen.getByRole('status')).toHaveTextContent("Wallet passes aren't part of this concept.");
  });
});
