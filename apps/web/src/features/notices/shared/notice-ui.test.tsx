import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useNoticeWords } from './notice-ui';

describe('A notice\'s days are the days of Riyadh (CodeRabbit on the FR-187 release)', () => {
  it('writes a moment as the day it falls on in Riyadh, not the UTC day, and a date without a time as it is', () => {
    const { result } = renderHook(() => useNoticeWords());
    expect(result.current.day('2026-01-01T23:30:00.000Z')).toBe('2026-01-02'); // 02:30 in Riyadh
    expect(result.current.day('2026-01-01')).toBe('2026-01-01');
    expect(result.current.day(null)).toBe('—');
  });
});
