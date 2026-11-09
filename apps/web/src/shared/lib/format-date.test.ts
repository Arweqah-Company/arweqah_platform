import { describe, expect, it } from 'vitest';
import { formatLongDate } from './format-date';

describe('formatLongDate', () => {
  it('writes the day out in the language of the screen, Gregorian with Latin digits', () => {
    expect(formatLongDate('2027-04-15', 'ar')).toBe('15 أبريل 2027');
    expect(formatLongDate('2027-05-03', 'ar')).toBe('3 مايو 2027');
    expect(formatLongDate('2027-04-15', 'en')).toBe('15 April 2027');
  });
});
