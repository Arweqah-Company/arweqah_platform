import { conflictDate, dateProblems, type CycleDate, type CycleDateProblem } from '@arweqah-platform/shared';
import type { TFunction } from 'i18next';
import { formatLongDate } from '@/shared/lib/format-date';

const ORDER: CycleDateProblem[] = ['end_before_start', 'before_previous', 'after_next'];

/**
 * Why a date cannot be set, in words, or undefined when it fits: the date is required, its end is not before its start, and (by the same rule the server uses)
 * it neither starts before the stage ahead of it ends nor runs past the day the stage behind it starts; the message names that day.
 */
export function dateMessage(t: TFunction<'performance'>, language: string, dates: readonly CycleDate[], next: CycleDate): string | undefined {
  if (!next.from) return t('dates.problems.required');
  const problems = dateProblems(dates, next);
  const first = ORDER.find((p) => problems.includes(p));
  if (!first) return undefined;
  const at = conflictDate(dates, next, first);
  return t(`dates.problems.${first}`, { date: at ? formatLongDate(at, language) : '' });
}
