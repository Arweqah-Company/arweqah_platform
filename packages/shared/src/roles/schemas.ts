import { z } from 'zod';
import { localizedNameSchema } from '../common/localized';
import { permissionScopeSchema, type PermissionScope } from '../permissions/scope';

export const permissionGrantSchema = z.strictObject({
  key: z.string().regex(/^[a-z][a-z0-9_-]*\.[a-z][a-z0-9_-]*$/),
  scope: permissionScopeSchema,
});

export const ROLE_ASSIGNMENTS = ['auto', 'manual'] as const;
export type RoleAssignment = (typeof ROLE_ASSIGNMENTS)[number];

/**
 * Roles the system keeps up to date by itself; nobody assigns them by hand.
 * `job_title`: one role per job title, held by whoever has that title; `node_head`: one role per organization level of a company, held by the managers of its units.
 */
export const ROLE_AUTO_RULES = ['everyone', 'has_reports', 'job_title', 'node_head', 'limited_access'] as const;
export type RoleAutoRule = (typeof ROLE_AUTO_RULES)[number];

/** Auto roles that follow the organization (created and removed with their job title or level, never edited or assigned by hand). */
export const DERIVED_ROLE_RULES: readonly RoleAutoRule[] = ['job_title', 'node_head'];
export const isDerivedRule = (rule: RoleAutoRule | null): boolean => rule !== null && DERIVED_ROLE_RULES.includes(rule);

export const upsertRoleSchema = z.strictObject({
  ...localizedNameSchema,
  description: z.string().trim().max(500).optional(),
  /** Left out = unchanged (a new role starts as manual). */
  assignment: z.enum(ROLE_ASSIGNMENTS).optional(),
  permissions: z.array(permissionGrantSchema).max(500),
});
export type UpsertRoleInput = z.infer<typeof upsertRoleSchema>;

/** Where a job title role belongs: the unit of the title and its company. */
export interface RoleOriginDto {
  companyId: string;
  companyNameAr: string;
  companyNameEn: string;
  unitNameAr: string;
  unitNameEn: string;
}

export interface RoleDto {
  id: string;
  nameAr: string;
  nameEn: string;
  description: string | null;
  isSystem: boolean;
  /** Auto: given by a rule or a setup elsewhere; manual: given by HR or an administrator. */
  assignment: RoleAssignment;
  /** The rule that keeps an auto role's members up to date; null for manual roles and for auto roles whose rule is not defined yet. */
  autoRule: RoleAutoRule | null;
  /** The job title this role belongs to (`job_title` roles only). */
  jobTitleId: string | null;
  /** The organization level this role belongs to (`node_head` roles only). */
  orgLevelId: string | null;
  /** The unit and company of a job title role; null for the other roles. */
  origin: RoleOriginDto | null;
  permissions: { key: string; scope: PermissionScope }[];
  usersCount: number;
}

/** How many memberships the last refresh of the automatic roles changed. */
export interface RoleSyncResultDto {
  changed: number;
}
