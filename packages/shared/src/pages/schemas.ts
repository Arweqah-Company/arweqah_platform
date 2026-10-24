import { z } from 'zod';

/**
 * The pages an administrator may hide from roles. Not in the list: the home page, "My profile" and "Security"
 * (everyone needs them), the notifications page (the header bell depends on it) and this page itself.
 */
export const HIDEABLE_PAGES = ['employees', 'org', 'companies', 'roles', 'audit', 'email-log', 'tickets', 'ticket-setup', 'ticket-figures', 'permissions', 'tasks', 'tasks-team', 'tasks-matrix', 'task-tags', 'task-policies'] as const;
export type HideablePage = (typeof HIDEABLE_PAGES)[number];

/** The page keys a role does not see; every other page stays visible. */
export const rolePagesSchema = z.strictObject({ hiddenPages: z.array(z.enum(HIDEABLE_PAGES)).max(HIDEABLE_PAGES.length) });
export type RolePagesInput = z.infer<typeof rolePagesSchema>;

export interface PageVisibilityRoleDto {
  id: string;
  nameAr: string;
  nameEn: string;
  /** A role that manages pages always sees every page, so nothing can be hidden from it. */
  locked: boolean;
  hiddenPages: HideablePage[];
}

export interface PageVisibilityDto {
  pages: HideablePage[];
  roles: PageVisibilityRoleDto[];
}
