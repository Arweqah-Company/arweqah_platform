import type { TFunction } from 'i18next';

/** Minutes as «3 h 12 min» in words of the language of the screen (`learning.hoursMinutes`). */
export function formatMinutes(total: number, t: TFunction<'career-profile'>): string {
  return t('learning.hoursMinutes', { hours: Math.floor(total / 60), minutes: total % 60 });
}
