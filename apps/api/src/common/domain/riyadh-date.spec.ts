import { describe, expect, it } from 'vitest';
import { formatRiyadhMoment, todayInRiyadh } from './riyadh-date';

describe('Dates the way the platform writes them', () => {
  it('writes a moment as YYYY-MM-DD HH:mm in Riyadh time, in 24 hours', () => {
    expect(formatRiyadhMoment(new Date('2026-12-01T11:30:00.000Z'))).toBe('2026-12-01 14:30');
    expect(formatRiyadhMoment(new Date('2026-12-01T21:05:00.000Z'))).toBe('2026-12-02 00:05');
  });

  it('still writes today as YYYY-MM-DD in Riyadh', () => {
    expect(todayInRiyadh(new Date('2026-11-30T21:30:00.000Z'))).toBe('2026-12-01');
  });
});
