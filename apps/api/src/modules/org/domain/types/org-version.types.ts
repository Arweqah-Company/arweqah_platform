import type { OrgCharter } from '@arweqah-platform/shared';

/** What the rules need to know about a stored version of a unit. */
export interface VersionPeriod {
  id: string;
  validFrom: string;
  validTo: string | null;
  appliedAt: Date | null;
}

export interface VersionPlan {
  /** The version to close the day before the new one starts, if there is one. */
  closeId: string | null;
  closeTo: string | null;
  /** A change on the very day the last version starts corrects that version instead of adding an empty one. */
  replaceId: string | null;
  /** The new values are in force today (otherwise they wait for their day). */
  applyNow: boolean;
}

/** The values a version holds and the unit copies while it is in force. */
export interface UnitValues {
  nameAr: string;
  nameEn: string;
  isActive: boolean;
  charter: OrgCharter | null;
}

export interface VersionView extends UnitValues {
  id: string;
  nodeId: string;
  validFrom: string;
  validTo: string | null;
  code: string | null;
  reason: string;
  createdBy: string | null;
  createdAt: Date;
  appliedAt: Date | null;
}
