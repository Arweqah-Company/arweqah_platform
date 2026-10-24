import type { TaskRecurrence } from '@arweqah-platform/shared';
import { addCalendarDays } from './task-dates.rules';

function addMonth(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number) as [number, number, number];
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(d, lastDay))).toISOString().slice(0, 10);
}

/** The due date of the next repeat, or null when the task does not repeat or the series ended. */
export function nextDueDate(dueDate: string, recurrence: TaskRecurrence, recurrenceEnd: string | null): string | null {
  const next = { none: null, daily: addCalendarDays(dueDate, 1), weekly: addCalendarDays(dueDate, 7), monthly: addMonth(dueDate) }[recurrence];
  if (!next) return null;
  return recurrenceEnd && next > recurrenceEnd ? null : next;
}
