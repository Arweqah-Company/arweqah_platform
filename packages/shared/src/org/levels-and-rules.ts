import { z } from 'zod';
import { localizedNameSchema } from '../common/localized';
import { MAX_ORG_LEVELS } from './schemas';

/** The key a parent–child rule uses for a type: the type's `key` (`sector`, `department`…, or the generated key of an added type), or `root` for the group. */
const typeKeySchema = z.string().trim().min(1).max(30);

/** One unit type, as the «Organization levels» window saves it. Types are not ordered: who may sit under whom is the rules table. */
export const orgLevelInputSchema = z.strictObject({
  /** Present when editing an existing type, absent for a new one (it gets a generated key). */
  id: z.uuid().optional(),
  ...localizedNameSchema,
  /** Whether units of this type take job titles and employees (a sector never does). */
  acceptsTitles: z.boolean(),
});
export type OrgLevelInput = z.infer<typeof orgLevelInputSchema>;

/**
 * Saves every type at once: the names, whether each accepts titles, and the added types. A type that is left out is removed
 * (only an added type no unit uses; a built-in type cannot be removed).
 */
export const saveOrgLevelsSchema = z.strictObject({
  levels: z.array(orgLevelInputSchema).min(1).max(MAX_ORG_LEVELS),
});
export type SaveOrgLevelsInput = z.infer<typeof saveOrgLevelsSchema>;

/** The «who may be created under whom» table: parent type key (or `root`) → the type keys allowed under it. */
export const saveOrgLevelRulesSchema = z.strictObject({
  rules: z.record(typeKeySchema, z.array(typeKeySchema).max(MAX_ORG_LEVELS)),
});
export type SaveOrgLevelRulesInput = z.infer<typeof saveOrgLevelRulesSchema>;

export interface OrgLevelDto {
  id: string;
  /** Stable key of the type (`sector`, `department`, `section`, `unit`, `office`, or the generated key of an added type); what the rules table and the units refer to. */
  key: string;
  nameAr: string;
  nameEn: string;
  sortOrder: number;
  acceptsTitles: boolean;
  /** The five built-in types cannot be removed. */
  isBuiltIn: boolean;
  /** Colour family of the type in the UI: the built-in key, or `unit` for an added type. */
  tone: string;
  /** The slot the type takes in a unit code (1 sector, 2 department, 3 section, 4 unit and added types); null for the office, which takes the slot where it sits. */
  codeSlot: number | null;
  unitsCount: number;
}

/** The types of the group and the rules table. */
export interface OrgLevelsDto {
  levels: OrgLevelDto[];
  rules: Record<string, string[]>;
}
