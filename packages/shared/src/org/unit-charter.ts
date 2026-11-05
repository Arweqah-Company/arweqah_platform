import { z } from 'zod';

/**
 * Dated versions and the charter of a unit (FR-99, plan 2.4). The current values stay on the unit; every change that carries a
 * start day and a reason writes a version: the one in force is the `current` one, a later start is `scheduled`, an earlier one is `past`
 * and is never rewritten.
 */
export const CHARTER_LIST_MAX_ITEMS = 30;
export const CHARTER_ITEM_MAX_LENGTH = 400;
export const CHARTER_TEXT_MAX_LENGTH = 2000;

/** The reason every dated change gives; it goes to the history and the audit log. */
export const changeReasonSchema = z.string().trim().min(3).max(500);

/** A text in both UI languages. */
export const localizedTextSchema = z.strictObject({
  ar: z.string().trim().max(CHARTER_TEXT_MAX_LENGTH),
  en: z.string().trim().max(CHARTER_TEXT_MAX_LENGTH),
});
export type LocalizedText = z.infer<typeof localizedTextSchema>;

/** An ordered list of short lines in both UI languages (outputs, duties, qualifications…). */
export const localizedListSchema = z.strictObject({
  ar: z.array(z.string().trim().min(1).max(CHARTER_ITEM_MAX_LENGTH)).max(CHARTER_LIST_MAX_ITEMS),
  en: z.array(z.string().trim().min(1).max(CHARTER_ITEM_MAX_LENGTH)).max(CHARTER_LIST_MAX_ITEMS),
});
export type LocalizedList = z.infer<typeof localizedListSchema>;

export const EMPTY_LOCALIZED_TEXT: LocalizedText = { ar: '', en: '' };
export const EMPTY_LOCALIZED_LIST: LocalizedList = { ar: [], en: [] };

/** The charter of a unit: why it exists, what it delivers, what is inside and outside its scope, and its limits. */
export const charterFieldsSchema = {
  purpose: localizedTextSchema,
  outputs: localizedListSchema,
  inScope: localizedListSchema,
  outOfScope: localizedListSchema,
  limits: localizedListSchema,
};
export const charterSchema = z.strictObject(charterFieldsSchema);
export type OrgCharter = z.infer<typeof charterSchema>;

export const EMPTY_CHARTER: OrgCharter = {
  purpose: EMPTY_LOCALIZED_TEXT,
  outputs: EMPTY_LOCALIZED_LIST,
  inScope: EMPTY_LOCALIZED_LIST,
  outOfScope: EMPTY_LOCALIZED_LIST,
  limits: EMPTY_LOCALIZED_LIST,
};

/**
 * `PUT /org/nodes/:id/charter`: the whole charter, the day it takes effect (today when left out; never in the past) and the reason.
 * A future day creates a scheduled version that the nightly job applies.
 */
export const updateCharterSchema = z.strictObject({
  ...charterFieldsSchema,
  effectiveFrom: z.iso.date().optional(),
  reason: changeReasonSchema,
});
export type UpdateCharterInput = z.infer<typeof updateCharterSchema>;

export const ORG_VERSION_STATUSES = ['past', 'current', 'scheduled'] as const;
export type OrgVersionStatus = (typeof ORG_VERSION_STATUSES)[number];

export interface OrgNodeVersionDto {
  /** Null for the first entry of a unit that has no stored version yet (made from the unit itself). */
  id: string | null;
  validFrom: string;
  validTo: string | null;
  status: OrgVersionStatus;
  nameAr: string;
  nameEn: string;
  code: string | null;
  isActive: boolean;
  charter: OrgCharter | null;
  reason: string;
  createdByName: string | null;
  createdAt: string | null;
}

/** One line of the unit's change log (the audit entries of the unit). */
export interface OrgChangeLogLineDto {
  id: string;
  action: string;
  actorName: string | null;
  reason: string | null;
  createdAt: string;
}

export interface OrgNodeVersionsDto {
  nodeId: string;
  /** The charter in force today (null when none was written). */
  charter: OrgCharter | null;
  /** Newest start first. */
  versions: OrgNodeVersionDto[];
  log: OrgChangeLogLineDto[];
}
