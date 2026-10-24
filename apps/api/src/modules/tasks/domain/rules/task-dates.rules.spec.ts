import { describe, expect, it } from 'vitest';
import { addCalendarDays, earliestBackdate, isWorkedOnAllowed, objectionExpiry, resolveCompletionDate } from './task-dates.rules';

describe('Task dates (FR-50, FR-52)', () => {
  it('records today by default, or a day inside the back-dating window', () => {
    expect(resolveCompletionDate({ today: '2026-11-10', dueDate: '2026-11-09', completedOn: undefined, backdateDays: 7 })).toEqual({ ok: true, completedOn: '2026-11-10' });
    expect(resolveCompletionDate({ today: '2026-11-10', dueDate: '2026-11-01', completedOn: '2026-11-03', backdateDays: 7 })).toEqual({ ok: true, completedOn: '2026-11-03' });
  });

  it('asks for the real date when the task is more than the back-dating days late', () => {
    expect(resolveCompletionDate({ today: '2026-11-20', dueDate: '2026-11-12', completedOn: undefined, backdateDays: 7 })).toEqual({ ok: false, reason: 'REQUIRED' });
    expect(resolveCompletionDate({ today: '2026-11-19', dueDate: '2026-11-12', completedOn: undefined, backdateDays: 7 })).toEqual({ ok: true, completedOn: '2026-11-19' });
  });

  it('refuses a date in the future or past the window', () => {
    expect(resolveCompletionDate({ today: '2026-11-10', dueDate: '2026-11-01', completedOn: '2026-11-11', backdateDays: 7 })).toEqual({ ok: false, reason: 'FUTURE' });
    expect(resolveCompletionDate({ today: '2026-11-10', dueDate: '2026-11-01', completedOn: '2026-11-02', backdateDays: 7 })).toEqual({ ok: false, reason: 'TOO_FAR' });
  });

  it('allows time entries only inside the window', () => {
    expect(earliestBackdate('2026-11-10', 7)).toBe('2026-11-03');
    expect(isWorkedOnAllowed('2026-11-03', '2026-11-10', 7)).toBe(true);
    expect(isWorkedOnAllowed('2026-11-02', '2026-11-10', 7)).toBe(false);
    expect(isWorkedOnAllowed('2026-11-11', '2026-11-10', 7)).toBe(false);
  });

  it('lapses an objection at the end of the third working day, Friday and Saturday off', () => {
    // Thursday 2026-11-05 + 3 working days = Tuesday 2026-11-10 (Sun, Mon, Tue); lapses at 24:00 Riyadh.
    expect(objectionExpiry('2026-11-05', 3).toISOString()).toBe('2026-11-10T21:00:00.000Z');
    expect(addCalendarDays('2026-11-30', 1)).toBe('2026-12-01');
  });
});
