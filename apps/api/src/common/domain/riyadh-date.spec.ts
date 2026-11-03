import { describe, expect, it } from 'vitest';
import { todayInRiyadh } from './riyadh-date';

describe('todayInRiyadh', () => {
  it('is the date in Riyadh (UTC+3), not the server\'s', () => {
    expect(todayInRiyadh(new Date('2026-11-02T20:59:59Z'))).toBe('2026-11-02');
    expect(todayInRiyadh(new Date('2026-11-02T21:00:00Z'))).toBe('2026-11-03');
    expect(todayInRiyadh(new Date('2026-12-31T22:30:00Z'))).toBe('2027-01-01');
  });
});
