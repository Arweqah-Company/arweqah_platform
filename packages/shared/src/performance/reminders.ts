import { z } from 'zod';

/**
 * The automatic reminders of the evaluation cycle (plan §3.7ج). HR keeps a list of them, each with its own words: the kind says who it is for and how it is timed,
 * the days say when, and the title and text are what the person reads (Arabic required, English optional: the Arabic is sent when there is none). Only the list
 * lives here; the sending is a later delivery (5c) and it stops at completion and never runs on the weekend.
 */
export const REMINDER_KINDS = ['self', 'mgr', 'mile', 'appr'] as const;
export type ReminderKind = (typeof REMINDER_KINDS)[number];

/** `before`: the days are before a date (the employee's deadline; a milestone); `every`: one number, a reminder repeated every N days (the manager; the calibration and approval holder). */
export const REMINDER_TIMING: Record<ReminderKind, 'before' | 'every'> = { self: 'before', mile: 'before', mgr: 'every', appr: 'every' };

export const REMINDER_MAX = 30;
/** The days before the self-evaluation deadline: each 1 to 30, up to ten of them. */
export const REMINDER_SELF_DAYS_MAX = 30;
export const REMINDER_SELF_COUNT_MAX = 10;
/** The single number of the other kinds: 1 to 14 days. */
export const REMINDER_DAYS_MAX = 14;
export const REMINDER_TEXT_MIN = 3;
export const REMINDER_TITLE_MAX = 120;
export const REMINDER_BODY_MAX = 600;

/** The days list as the form keeps it: each day once, the farthest first (7, 3, 1). */
export const normalizeReminderDays = (days: readonly number[]): number[] => [...new Set(days)].sort((a, b) => b - a);

/** Whether the days fit the kind: the employee's reminder has one to ten days (1 to 30); the others have exactly one number (1 to 14). */
export function reminderDaysFit(kind: ReminderKind, days: readonly number[]): boolean {
  if (kind === 'self') return days.length >= 1 && days.length <= REMINDER_SELF_COUNT_MAX && days.every((d) => Number.isInteger(d) && d >= 1 && d <= REMINDER_SELF_DAYS_MAX);
  return days.length === 1 && Number.isInteger(days[0]) && days[0]! >= 1 && days[0]! <= REMINDER_DAYS_MAX;
}

export const reminderSchema = z
  .strictObject({
    kind: z.enum(REMINDER_KINDS),
    on: z.boolean(),
    days: z.array(z.number()).min(1).max(REMINDER_SELF_COUNT_MAX),
    titleAr: z.string().trim().min(REMINDER_TEXT_MIN).max(REMINDER_TITLE_MAX),
    titleEn: z.string().trim().max(REMINDER_TITLE_MAX),
    bodyAr: z.string().trim().min(REMINDER_TEXT_MIN).max(REMINDER_BODY_MAX),
    bodyEn: z.string().trim().max(REMINDER_BODY_MAX),
  })
  .refine((r) => reminderDaysFit(r.kind, r.days), { path: ['days'], message: 'REMINDER_DAYS' });
export type ReminderInput = z.infer<typeof reminderSchema>;

export interface ReminderDto extends ReminderInput {
  id: string;
}
