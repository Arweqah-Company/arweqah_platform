import { describe, expect, it } from 'vitest';
import { isWeekend, reminderDue } from './reminder-send.rules';

// 2026-11-10 is a Tuesday; 2026-11-13 a Friday, 2026-11-14 a Saturday.
describe('reminderDue: when an automatic reminder of the cycle goes out (FR-124)', () => {
  it('knows the weekend: Friday and Saturday', () => {
    expect(isWeekend('2026-11-13')).toBe(true);
    expect(isWeekend('2026-11-14')).toBe(true);
    expect(isWeekend('2026-11-10')).toBe(false);
  });

  it('sends the employee\'s reminder on each of its days before the deadline, and on no other day', () => {
    const base = { kind: 'self', days: [7, 3, 1], deadline: '2026-11-17', lastSentOn: null } as const;
    expect(reminderDue({ ...base, today: '2026-11-10' })).toBe(true); // 7 days before
    expect(reminderDue({ ...base, today: '2026-11-16' })).toBe(true); // 1 day before
    expect(reminderDue({ ...base, today: '2026-11-11' })).toBe(false);
    expect(reminderDue({ ...base, today: '2026-11-18' })).toBe(false); // past the deadline
  });

  it('does not send the employee\'s reminder without a deadline', () => {
    expect(reminderDue({ kind: 'self', days: [1], today: '2026-11-10', deadline: null, lastSentOn: null })).toBe(false);
  });

  it('sends the manager\'s reminder every N days from the last send, and at once the first time', () => {
    const base = { kind: 'mgr', days: [3], deadline: null } as const;
    expect(reminderDue({ ...base, today: '2026-11-10', lastSentOn: null })).toBe(true);
    expect(reminderDue({ ...base, today: '2026-11-10', lastSentOn: '2026-11-08' })).toBe(false);
    expect(reminderDue({ ...base, today: '2026-11-10', lastSentOn: '2026-11-07' })).toBe(true);
  });

  it('never sends on the weekend and never twice in a day', () => {
    expect(reminderDue({ kind: 'mgr', days: [1], today: '2026-11-13', deadline: null, lastSentOn: null })).toBe(false);
    expect(reminderDue({ kind: 'mgr', days: [1], today: '2026-11-10', deadline: null, lastSentOn: '2026-11-10' })).toBe(false);
    expect(reminderDue({ kind: 'self', days: [7], today: '2026-11-14', deadline: '2026-11-21', lastSentOn: null })).toBe(false);
  });
});
