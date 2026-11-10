import type { LeaderKind, ManagementMode, SetLeaderInput } from '@arweqah-platform/shared';

export interface LeaderForm {
  companyId: string | null;
  employeeId: string | null;
  kind: LeaderKind;
  /** The title of the unit a leader takes (an acting leader stays where they are). */
  jobTitleId: string | null;
  validFrom: string;
  validTo: string;
  reason: string;
}

export const REASON_MIN = 3;

/**
 * The companies a leader may be set for: a shared unit is led from the group company only; a unit managed per company is led for each company
 * by one of its own people, so any company may be chosen.
 */
export function leaderCompanies<T extends { id: string }>(mode: ManagementMode, groupCompanyId: string, all: T[]): T[] {
  return mode === 'shared' ? all.filter((c) => c.id === groupCompanyId) : all;
}

/** The first thing wrong with the dates, as a stable key; undefined when they are fine. An acting leader needs both ends of the window. */
export function windowProblem(form: LeaderForm, today: string): 'fromPast' | 'toNeeded' | 'toBeforeFrom' | undefined {
  if (form.validFrom < today) return 'fromPast';
  if (form.kind === 'acting' && !form.validTo) return 'toNeeded';
  return form.validTo && form.validTo < form.validFrom ? 'toBeforeFrom' : undefined;
}

/** The reason is optional; when it is written it has at least three letters. */
export const reasonOk = (reason: string): boolean => !reason.trim() || reason.trim().length >= REASON_MIN;

export const leaderFormValid = (form: LeaderForm, today: string): boolean =>
  !!form.companyId && !!form.employeeId && (form.kind === 'acting' || !!form.jobTitleId) && !!form.validFrom && reasonOk(form.reason) && !windowProblem(form, today);

/** The request for a valid form. */
export const toSetLeaderInput = (form: LeaderForm): SetLeaderInput => ({
  companyId: form.companyId as string,
  employeeId: form.employeeId as string,
  kind: form.kind,
  ...(form.kind === 'leader' && form.jobTitleId ? { jobTitleId: form.jobTitleId } : {}),
  validFrom: form.validFrom,
  validTo: form.validTo || null,
  ...(form.reason.trim() ? { reason: form.reason.trim() } : {}),
});
