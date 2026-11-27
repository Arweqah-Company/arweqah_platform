import { describe, expect, it } from 'vitest';
import { formatNumber } from './format-number';

describe('FR-201: numbers are written with Latin digits', () => {
  it('separates thousands with a comma and never uses Arabic-Indic digits', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(12.5)).toBe('12.5');
  });
});
