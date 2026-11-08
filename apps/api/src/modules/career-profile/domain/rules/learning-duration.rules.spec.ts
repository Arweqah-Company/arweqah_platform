import { describe, expect, it } from 'vitest';
import { durationMinutes } from './learning-duration.rules';

describe('learning duration rules (FR-113)', () => {
  it.each([
    ['ساعتان', 120],
    ['ساعة', 60],
    ['3 ساعات', 180],
    ['8 ساعات', 480],
    ['ساعة و30 دقيقة', 90],
    ['3 ساعات و12 دقيقة', 192],
    ['5 ساعات و18 دقيقة', 318],
    ['ساعتان و48 دقيقة', 168],
    ['45 دقيقة', 45],
    ['12 ساعة', 720],
    ['', 0],
    ['قريبًا', 0],
  ])('reads «%s» as %i minutes', (text, minutes) => {
    expect(durationMinutes(text)).toBe(minutes);
  });
});
