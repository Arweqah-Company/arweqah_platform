import { describe, expect, it } from 'vitest';
import { dayProblem, isRealDay, maskDay, toLatinDigits } from './date-mask';

describe('FR-201: the date field writes YYYY-MM-DD in Latin digits', () => {
  it('adds the dashes itself while typing and stops at 8 digits', () => {
    expect(maskDay('2')).toBe('2');
    expect(maskDay('20261')).toBe('2026-1');
    expect(maskDay('202612')).toBe('2026-12');
    expect(maskDay('2026120')).toBe('2026-12-0');
    expect(maskDay('20261201999')).toBe('2026-12-01');
    expect(maskDay('2026-')).toBe('2026');
  });

  it('turns Arabic-Indic and Persian digits into Latin ones, also from a paste with other separators', () => {
    expect(toLatinDigits('٠١٢٣٤٥٦٧٨٩۰۱۲')).toBe('0123456789012');
    expect(maskDay('١٩٩٦/١١/٢٤')).toBe('1996-11-24');
    expect(maskDay('24/11/1996 abc')).toBe('2411-19-96');
  });

  it('knows a real day from one that does not exist', () => {
    expect(isRealDay('2026-12-01')).toBe(true);
    expect(isRealDay('2028-02-29')).toBe(true);
    expect(isRealDay('2027-02-29')).toBe(false);
    expect(isRealDay('2026-13-01')).toBe(false);
    expect(isRealDay('2026-1')).toBe(false);
  });

  it('reports a format problem or a range problem only for a filled value', () => {
    expect(dayProblem('')).toBeNull();
    expect(dayProblem('2026-1')).toBe('format');
    expect(dayProblem('2026-11-01', '2026-11-27')).toBe('range');
    expect(dayProblem('2026-12-01', '2026-11-27', '2026-12-31')).toBeNull();
    expect(dayProblem('2027-01-01', undefined, '2026-12-31')).toBe('range');
  });
});
