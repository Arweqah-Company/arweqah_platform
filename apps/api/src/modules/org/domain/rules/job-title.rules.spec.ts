import { describe, expect, it } from 'vitest';
import { canSetGrade, createsCycle, nextTitleCode, nextTitleSequence } from './job-title.rules';

const key = { unitCode: 'OPS.03.03.01', grade: 7, track: 'P' as const };

describe('job title codes (FR-104)', () => {
  it('builds the first code of a unit, grade and track with sequence 01', () => {
    expect(nextTitleCode([], key)).toBe('OPS.03.03.01-L7P-01');
  });

  it('takes one more than the highest sequence of the same unit, grade and track, and ignores the others', () => {
    const codes = ['OPS.03.03.01-L7P-01', 'OPS.03.03.01-L7P-04', 'OPS.03.03.01-L6P-09', 'OPS.03.03.02-L7P-07', 'OPS.03.03.01-L7M-08', 'junk'];
    expect(nextTitleSequence(codes, key)).toBe(5);
  });

  it('counts the codes of titles that were deleted too (a number is never reused)', () => {
    expect(nextTitleCode(['OPS.03.03.01-L7P-01', 'OPS.03.03.01-L7P-02'], key)).toBe('OPS.03.03.01-L7P-03');
  });
});

describe('the reporting line of job titles never loops (FR-104)', () => {
  const up = new Map<string, string | null>([['a', 'b'], ['b', 'c'], ['c', null], ['d', null]]);

  it('refuses a title reporting to itself or to one that reports to it, directly or further up', () => {
    expect(createsCycle(up, 'a', 'a')).toBe(true);
    expect(createsCycle(up, 'c', 'a')).toBe(true);
    expect(createsCycle(up, 'b', 'a')).toBe(true);
  });

  it('accepts a title that is not below this one, and survives a loop that already exists', () => {
    expect(createsCycle(up, 'a', 'd')).toBe(false);
    expect(createsCycle(up, 'd', 'a')).toBe(false);
    expect(createsCycle(new Map([['x', 'y'], ['y', 'x']]), 'z', 'x')).toBe(false);
  });
});

describe('a grade and track are set once (FR-106)', () => {
  it('allows them for a title that has none, and refuses a title that has them', () => {
    expect(canSetGrade({ grade: null, track: null }, { grade: 7, track: 'P' })).toBe(true);
    expect(canSetGrade({ grade: 7, track: 'P' }, { grade: 6, track: 'P' })).toBe(false);
    expect(canSetGrade({ grade: 7, track: 'P' }, {})).toBe(true);
  });
});
