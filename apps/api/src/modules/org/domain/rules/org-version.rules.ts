import type { OrgVersionStatus } from '@arweqah-platform/shared';
import { dayBefore } from '../../../../common/domain/dates';
import { OrgVersionDateNotAfterError, OrgVersionInThePastError } from '../errors/org.errors';
import type { VersionPeriod, VersionPlan } from '../types/org-version.types';

/**
 * What a new version starting `effectiveFrom` does to the versions of one unit (in any order; the last one is open-ended):
 * it starts today or later, strictly after the last version (on the very day the last one starts, it corrects that one),
 * closes the open one the day before, and is in force at once only when it starts today. A past version is never touched.
 */
export function planVersion(periods: readonly VersionPeriod[], effectiveFrom: string, today: string): VersionPlan {
  if (effectiveFrom < today) throw new OrgVersionInThePastError();
  const last = [...periods].sort((a, b) => a.validFrom.localeCompare(b.validFrom)).at(-1);
  const applyNow = effectiveFrom === today;
  if (last && effectiveFrom === last.validFrom && last.validTo === null) return { closeId: null, closeTo: null, replaceId: last.id, applyNow };
  if (last && effectiveFrom <= last.validFrom) throw new OrgVersionDateNotAfterError(last.validFrom);
  const open = periods.find((p) => p.validTo === null);
  return { closeId: open?.id ?? null, closeTo: open ? dayBefore(effectiveFrom) : null, replaceId: null, applyNow };
}

export function versionStatus(period: Pick<VersionPeriod, 'validFrom' | 'validTo'>, today: string): OrgVersionStatus {
  if (period.validFrom > today) return 'scheduled';
  return period.validTo !== null && period.validTo < today ? 'past' : 'current';
}

/** The version a unit shows today: the newest one that has started. */
export function versionInForce<T extends Pick<VersionPeriod, 'validFrom' | 'validTo'>>(periods: readonly T[], today: string): T | null {
  return [...periods].filter((p) => versionStatus(p, today) === 'current').sort((a, b) => b.validFrom.localeCompare(a.validFrom))[0] ?? null;
}
