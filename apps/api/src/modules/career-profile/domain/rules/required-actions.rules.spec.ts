import { describe, expect, it } from 'vitest';
import { deadlineOf } from './required-actions.rules';

describe('deadlineOf (FR-113)', () => {
  it('reads a day before a month and a month alone as its last day', () => {
    expect(deadlineOf('حتى 15 أكتوبر 2026')).toBe('2026-10-15');
    expect(deadlineOf('أكتوبر 2026')).toBe('2026-10-31');
  });

  it('does not take the last digits of an earlier year as the day of the last month', () => {
    expect(deadlineOf('أكتوبر 2026 ومارس 2027')).toBe('2027-03-31');
    expect(deadlineOf('يناير 2029 وفبراير 2030')).toBe('2030-02-28');
  });
});
