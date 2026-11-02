import type { AccessExceptionDto, ExceptionRef } from '@arweqah-platform/shared';

/** A row of the exceptions list as stored: the permission's name is the catalog's, so the repository leaves it to the service. */
export type AccessExceptionRow = Omit<AccessExceptionDto, 'targetNameAr' | 'targetNameEn'> & { targetNameAr: string | null; targetNameEn: string | null };

export abstract class AccessExceptionRepository {
  /** Everything held outside the job title, the Employee role and the person's place that has not ended: manual roles, a person's own permissions, groups of roles. */
  abstract list(): Promise<AccessExceptionRow[]>;
  /** Takes one back; false when it is not there. */
  abstract remove(ref: ExceptionRef): Promise<boolean>;
  /** Changes the last day (null = no end date); false when it is not there. */
  abstract setExpiry(ref: ExceptionRef, expiresAt: string | null): Promise<boolean>;
  /** Takes back everything whose last day is before `today` and says what went. */
  abstract removeEnded(today: string): Promise<ExceptionRef[]>;
}
