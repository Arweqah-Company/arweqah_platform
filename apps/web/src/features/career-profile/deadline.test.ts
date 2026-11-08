import { describe, expect, it } from 'vitest';
import { daysUntil } from './deadline';

describe('daysUntil (FR-111)', () => {
  const today = new Date(2026, 10, 8, 23, 30);
  it('counts calendar days, whatever the time of day', () => {
    expect(daysUntil('2026-11-08', today)).toBe(0);
    expect(daysUntil('2026-11-09', today)).toBe(1);
    expect(daysUntil('2026-12-08', today)).toBe(30);
    expect(daysUntil('2026-11-07', today)).toBe(-1);
    expect(daysUntil('2027-03-31', new Date(2026, 10, 8, 0, 5))).toBe(143);
  });
});
