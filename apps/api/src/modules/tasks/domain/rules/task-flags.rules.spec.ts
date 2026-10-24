import { describe, expect, it } from 'vitest';
import { flagsOf, isOverdue, isStale, isUrgent } from './task-flags.rules';

const at = (iso: string) => new Date(iso);
const base = { status: 'todo' as const, dueDate: '2026-11-10', urgentManual: false, lastActivityAt: at('2026-11-01T00:00:00Z'), hasOpenObjection: false };

describe('Task flags (FR-49)', () => {
  it('is urgent when due within the policy days, overdue, or marked by hand', () => {
    expect(isUrgent(base, '2026-11-08', 2)).toBe(true);
    expect(isUrgent(base, '2026-11-07', 2)).toBe(false);
    expect(isUrgent(base, '2026-11-12', 2)).toBe(true);
    expect(isUrgent({ ...base, urgentManual: true }, '2026-11-01', 2)).toBe(true);
  });

  it('is never urgent or overdue once finished or rejected', () => {
    for (const status of ['done', 'rejected'] as const) {
      expect(isUrgent({ ...base, status, urgentManual: true }, '2026-12-01', 2)).toBe(false);
      expect(isOverdue(status, base.dueDate, '2026-12-01')).toBe(false);
    }
  });

  it('is overdue only after the due day', () => {
    expect(isOverdue('todo', '2026-11-10', '2026-11-10')).toBe(false);
    expect(isOverdue('in_progress', '2026-11-10', '2026-11-11')).toBe(true);
  });

  it('is stale after the quiet days, except while waiting for approval', () => {
    const last = at('2026-10-01T00:00:00Z');
    expect(isStale({ status: 'todo', lastActivityAt: last }, at('2026-10-31T00:00:00Z'), 30)).toBe(false);
    expect(isStale({ status: 'todo', lastActivityAt: last }, at('2026-11-01T00:00:00Z'), 30)).toBe(true);
    expect(isStale({ status: 'pending_approval', lastActivityAt: last }, at('2026-12-01T00:00:00Z'), 30)).toBe(false);
    expect(isStale({ status: 'done', lastActivityAt: last }, at('2026-12-01T00:00:00Z'), 30)).toBe(false);
  });

  it('collects the four flags', () => {
    expect(flagsOf({ ...base, hasOpenObjection: true }, { urgentDays: 2, staleDays: 30 }, '2026-11-12', at('2026-11-12T00:00:00Z'))).toEqual({ urgent: true, overdue: true, stale: false, objected: true });
  });
});
