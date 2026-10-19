import type { Branch, Department, Team } from './org.entities';

export type OrgUnitKind = 'branch' | 'department' | 'team';

export abstract class OrgRepository {
  abstract branches(): Promise<Branch[]>;
  abstract departments(): Promise<Department[]>;
  abstract teams(): Promise<Team[]>;
  abstract findBranch(id: string): Promise<Branch | null>;
  abstract findDepartment(id: string): Promise<Department | null>;
  abstract findTeam(id: string): Promise<Team | null>;
  abstract branchCodeTaken(code: string, exceptId?: string): Promise<boolean>;
  abstract save<T extends Branch | Department | Team>(unit: T): Promise<T>;
  abstract softDelete(kind: OrgUnitKind, id: string): Promise<void>;
  /** Child units and placed users that would be orphaned by deleting this unit. */
  abstract dependents(kind: OrgUnitKind, id: string): Promise<number>;
}
