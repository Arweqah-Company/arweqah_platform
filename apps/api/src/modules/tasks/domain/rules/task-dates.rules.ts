import { addWorkingDays, daysBetween } from '@arweqah-platform/shared';

export type CompletionDate = { ok: true; completedOn: string } | { ok: false; reason: 'REQUIRED' | 'TOO_FAR' | 'FUTURE' };

/** The earliest day that may still be recorded (the back-dating window). */
export function earliestBackdate(today: string, backdateDays: number): string {
  return addCalendarDays(today, -backdateDays);
}

export function addCalendarDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * The day a finished task is recorded to have ended. Today by default; an earlier day is accepted up to the back-dating days.
 * A task finished more than that many days after its due date must say the real day (it cannot be left to the default).
 */
export function resolveCompletionDate(input: { today: string; dueDate: string; completedOn: string | undefined; backdateDays: number }): CompletionDate {
  const { today, dueDate, completedOn, backdateDays } = input;
  if (completedOn === undefined) return daysBetween(dueDate, today) > backdateDays ? { ok: false, reason: 'REQUIRED' } : { ok: true, completedOn: today };
  if (completedOn > today) return { ok: false, reason: 'FUTURE' };
  if (completedOn < earliestBackdate(today, backdateDays)) return { ok: false, reason: 'TOO_FAR' };
  return { ok: true, completedOn };
}

/** A time entry may be dated from the back-dating window up to today. */
export const isWorkedOnAllowed = (workedOn: string, today: string, backdateDays: number): boolean => workedOn <= today && workedOn >= earliestBackdate(today, backdateDays);

/** When an unanswered objection lapses: the end of the Nth working day after today (Riyadh), as a UTC instant (24:00 Riyadh = 21:00 UTC). */
export function objectionExpiry(today: string, workingDays: number): Date {
  return new Date(`${addWorkingDays(today, workingDays)}T21:00:00Z`);
}
