import { describe, expect, it } from 'vitest';
import { nextDueDate } from './task-recurrence.rules';

describe('Task recurrence (FR-53)', () => {
  it('moves the due date by the period', () => {
    expect(nextDueDate('2026-11-10', 'daily', null)).toBe('2026-11-11');
    expect(nextDueDate('2026-11-10', 'weekly', null)).toBe('2026-11-17');
    expect(nextDueDate('2026-11-10', 'monthly', null)).toBe('2026-12-10');
  });

  it('keeps the last day of a short month', () => {
    expect(nextDueDate('2026-01-31', 'monthly', null)).toBe('2026-02-28');
  });

  it('stops without a repeat or after the end date', () => {
    expect(nextDueDate('2026-11-10', 'none', null)).toBeNull();
    expect(nextDueDate('2026-11-10', 'weekly', '2026-11-16')).toBeNull();
    expect(nextDueDate('2026-11-10', 'weekly', '2026-11-17')).toBe('2026-11-17');
  });
});
