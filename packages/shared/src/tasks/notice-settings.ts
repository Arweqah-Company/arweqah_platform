import { z } from 'zod';

/** Where a person wants the task summary and reminders: in the app, by e-mail, or both (FR-218). */
export const TASK_NOTICE_CHANNELS = ['in_app', 'email', 'both'] as const;
export type TaskNoticeChannel = (typeof TASK_NOTICE_CHANNELS)[number];

/** A person's task summary and reminder settings (FR-215…FR-218); the hour is Riyadh time, 0 to 23. */
export const taskNoticeSettingsSchema = z.strictObject({
  channel: z.enum(TASK_NOTICE_CHANNELS),
  digestEnabled: z.boolean(),
  digestHour: z.number().int().min(0).max(23),
  remindersEnabled: z.boolean(),
});
export type TaskNoticeSettings = z.infer<typeof taskNoticeSettingsSchema>;

/** What applies to a person who never saved settings. */
export const TASK_NOTICE_DEFAULTS: TaskNoticeSettings = { channel: 'in_app', digestEnabled: true, digestHour: 8, remindersEnabled: true };

/** The hour of the day (0 to 23) in Riyadh. */
export const riyadhHour = (now: Date = new Date()): number => new Date(now.getTime() + 3 * 3_600_000).getUTCHours();
