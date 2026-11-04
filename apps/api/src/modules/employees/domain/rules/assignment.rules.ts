import type { AssignmentStatus } from '@arweqah-platform/shared';
import { AssignmentDateNotAfterError, AssignmentInThePastError } from '../errors/assignment.errors';
import type { ChangePlan, Period } from '../types/assignment.types';

/** The day before an ISO date (calendar arithmetic in UTC, so no daylight-saving drift). */
export function dayBefore(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

/**
 * What a new period starting `validFrom` does to the history of one field (periods in any order):
 * it starts today or later, strictly after the last period (on the very day it began, it corrects that period),
 * closes the one that is open the day before, and is in force at once only when it starts today.
 */
export function planChange(periods: Period[], validFrom: string, today: string): ChangePlan {
  if (validFrom < today) throw new AssignmentInThePastError();
  const last = [...periods].sort((a, b) => a.validFrom.localeCompare(b.validFrom)).at(-1);
  const applyNow = validFrom === today;
  if (last && validFrom === last.validFrom && last.validTo === null) return { closeId: null, closeTo: null, replaceId: last.id, applyNow };
  if (last && validFrom <= last.validFrom) throw new AssignmentDateNotAfterError(last.validFrom);
  const open = periods.find((p) => p.validTo === null);
  return { closeId: open?.id ?? null, closeTo: open ? dayBefore(validFrom) : null, replaceId: null, applyNow };
}

export function statusOf(period: Pick<Period, 'validFrom' | 'validTo'>, today: string): AssignmentStatus {
  if (period.validFrom > today) return 'pending';
  return period.validTo !== null && period.validTo < today ? 'past' : 'current';
}
