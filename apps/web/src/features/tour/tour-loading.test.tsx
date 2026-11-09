import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TourLoading } from './tour-loading';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('Between two steps of the tour (FR-67)', () => {
  it('shows nothing for a step that opens at once, so a quick step does not flicker', () => {
    render(<TourLoading />);
    act(() => { vi.advanceTimersByTime(200); });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('says it is opening the next step when it takes a moment, instead of standing still', () => {
    render(<TourLoading />);
    act(() => { vi.advanceTimersByTime(400); });
    expect(screen.getByRole('status')).toHaveTextContent('جارٍ فتح الخطوة التالية');
  });
});
