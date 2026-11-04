import { describe, expect, it } from 'vitest';
import { dayBefore, planChange, statusOf } from './assignment.rules';

const open = { id: 'a', validFrom: '2026-01-01', validTo: null, appliedAt: new Date() };

describe('placement history rules (FR-89)', () => {
  it('counts the day before across months and years', () => {
    expect(dayBefore('2026-03-01')).toBe('2026-02-28');
    expect(dayBefore('2026-01-01')).toBe('2025-12-31');
    expect(dayBefore('2024-03-01')).toBe('2024-02-29');
  });

  it('closes the open period the day before a change that starts later, which waits for its day', () => {
    expect(planChange([open], '2026-06-10', '2026-06-01')).toEqual({ closeId: 'a', closeTo: '2026-06-09', replaceId: null, applyNow: false });
  });

  it('applies at once a change that starts today', () => {
    expect(planChange([open], '2026-06-01', '2026-06-01')).toEqual({ closeId: 'a', closeTo: '2026-05-31', replaceId: null, applyNow: true });
  });

  it('refuses the past and a date that does not come after the last period', () => {
    expect(() => planChange([open], '2026-05-31', '2026-06-01')).toThrow('past');
    expect(() => planChange([{ ...open, validTo: '2026-03-01' }], '2026-01-01', '2025-12-01')).toThrow('after 2026-01-01');
    const waiting = { id: 'b', validFrom: '2026-07-01', validTo: null, appliedAt: null };
    expect(() => planChange([{ ...open, validTo: '2026-06-30' }, waiting], '2026-06-15', '2026-06-01')).toThrow('after 2026-07-01');
  });

  it('corrects the period that began the same day instead of adding an empty one', () => {
    expect(planChange([open], '2026-01-01', '2026-01-01')).toEqual({ closeId: null, closeTo: null, replaceId: 'a', applyNow: true });
  });

  it('starts a first period without closing anything', () => {
    expect(planChange([], '2026-06-01', '2026-06-01')).toEqual({ closeId: null, closeTo: null, replaceId: null, applyNow: true });
  });

  it('names the state of a period', () => {
    expect(statusOf({ validFrom: '2026-01-01', validTo: '2026-02-01' }, '2026-06-01')).toBe('past');
    expect(statusOf({ validFrom: '2026-01-01', validTo: null }, '2026-06-01')).toBe('current');
    expect(statusOf({ validFrom: '2026-07-01', validTo: null }, '2026-06-01')).toBe('pending');
    expect(statusOf({ validFrom: '2026-01-01', validTo: '2026-06-01' }, '2026-06-01')).toBe('current');
  });
});
