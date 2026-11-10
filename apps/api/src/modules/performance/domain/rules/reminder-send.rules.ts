import { WEEKEND_DAYS, daysBetween, type ReminderKind } from '@arweqah-platform/shared';

/** The reminders never go out on the weekend (Friday and Saturday). */
export const isWeekend = (day: string): boolean => WEEKEND_DAYS.includes(new Date(`${day}T00:00:00Z`).getUTCDay());

/** What decides whether a reminder is due today. */
export interface DueInput {
  kind: ReminderKind;
  days: readonly number[];
  today: string;
  /** The deadline the «before» reminders count back from (the self-evaluation deadline). */
  deadline: string | null;
  lastSentOn: string | null;
}

/**
 * Whether a reminder is due today: never on the weekend and never twice in a day. A «before» reminder (the employee's) is due when today is one of its days
 * before the deadline; an «every» reminder (the manager's) is due when it was never sent or the last send was its number of days ago.
 */
export function reminderDue(input: DueInput): boolean {
  const { kind, days, today, deadline, lastSentOn } = input;
  if (isWeekend(today) || lastSentOn === today) return false;
  if (kind === 'self') return deadline !== null && days.includes(daysBetween(today, deadline));
  return lastSentOn === null || daysBetween(lastSentOn, today) >= (days[0] ?? 1);
}
