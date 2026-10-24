import { describe, expect, it } from 'vitest';
import { fitLabel } from './icicle';

describe('Icicle block labels', () => {
  it('keeps a name that fits, cuts one that does not, and leaves a sliver unlabelled', () => {
    expect(fitLabel('إدارة', 400)).toBe('إدارة');
    expect(fitLabel('إدارة الموارد البشرية', 90)).toMatch(/…$/);
    expect(fitLabel('إدارة الموارد البشرية', 90).length).toBeLessThanOrEqual(6);
    expect(fitLabel('إدارة', 20)).toBe('');
  });
});
