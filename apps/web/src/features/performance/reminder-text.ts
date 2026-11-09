import type { ReminderDto } from '@arweqah-platform/shared';
import type { TFunction } from 'i18next';

/** The title in the language of the screen (the Arabic one when there is no English). */
export const titleOf = (r: Pick<ReminderDto, 'titleAr' | 'titleEn'>, language: string): string => (language.startsWith('ar') ? r.titleAr : r.titleEn || r.titleAr);

/** When a reminder comes, in words: «7, 3, 1 days before the last day», «every 2 days», «3 days before the date». */
export function reminderTiming(t: TFunction<'performance'>, _language: string, r: Pick<ReminderDto, 'kind' | 'days'>): string {
  if (r.kind === 'self') return t('reminders.summary.self', { days: r.days.join(t('reminders.separator')) });
  return t(`reminders.summary.${r.kind}`, { n: r.days[0] });
}
