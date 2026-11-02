import type { RoleDto } from '@arweqah-platform/shared';

/** Where a role's members come from: handed out by hand, a rule, a job title, or the managers of an organization level. */
export type RoleKind = 'manual' | 'rule' | 'jobTitle' | 'head';

export const ROLE_KINDS: RoleKind[] = ['manual', 'rule', 'jobTitle', 'head'];

export function roleKind(role: Pick<RoleDto, 'autoRule'>): RoleKind {
  if (role.autoRule === 'job_title') return 'jobTitle';
  if (role.autoRule === 'node_head') return 'head';
  return role.autoRule ? 'rule' : 'manual';
}

/** A role of a job title or a level follows it: its name and members are not edited here. */
export const isDerivedRole = (role: Pick<RoleDto, 'autoRule'> | null): boolean => !!role && (role.autoRule === 'job_title' || role.autoRule === 'node_head');
