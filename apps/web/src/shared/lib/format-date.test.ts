import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime } from './format-date';

describe('One way to write a date everywhere', () => {
  it('writes a day as YYYY-MM-DD and leaves a day without a time exactly as it is', () => {
    expect(formatDate('2026-12-01')).toBe('2026-12-01');
    expect(formatDate('2027-01-05')).toBe('2027-01-05');
  });

  it('writes a moment as the day it falls on in Riyadh (UTC+3), whatever the zone of the machine', () => {
    expect(formatDate('2026-11-30T21:30:00.000Z')).toBe('2026-12-01'); // 00:30 in Riyadh
    expect(formatDate(new Date('2026-12-01T20:59:00.000Z'))).toBe('2026-12-01'); // 23:59 in Riyadh
  });

  it('writes the time in 24 hours with Latin digits, in Riyadh time', () => {
    expect(formatDateTime('2026-12-01T11:30:00.000Z')).toBe('2026-12-01\u00a014:30');
    expect(formatDateTime('2026-12-01T21:05:00.000Z')).toBe('2026-12-02\u00a000:05'); // midnight is 00, never 24
  });

  it('keeps the day and the time together inside Arabic text (a no-break space) and gives a file an ordinary space', () => {
    expect(formatDateTime('2026-12-01T11:30:00.000Z')).not.toContain(' ');
    expect(formatDateTime('2026-12-01T11:30:00.000Z', true)).toBe('2026-12-01 14:30');
  });

  it('is empty for nothing or for what is not a date', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
    expect(formatDateTime('not a date')).toBe('');
  });
});
