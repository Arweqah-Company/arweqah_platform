import { type PermissionGrant, type PermissionScope, widestScope } from '@arweqah-platform/shared';

export interface Placement {
  branchId: string | null;
  departmentId: string | null;
  teamId: string | null;
  managerId: string | null;
}

/** The organizational coordinates of a record, used to check a scoped grant. */
export interface ScopedResource {
  ownerId?: string | null;
  teamId?: string | null;
  departmentId?: string | null;
  branchId?: string | null;
}

/** Filter a list query must apply for a permission at the user's widest scope. */
export interface ScopeFilter {
  scope: PermissionScope;
  userId: string;
  /** The placement id matching the scope (branch / department / team), null for own and company. */
  unitId: string | null;
}

/** Immutable snapshot of what a user may do, built once per request. */
export class AccessContext {
  private readonly scopes: Map<string, PermissionScope>;

  constructor(
    readonly userId: string,
    readonly placement: Placement,
    grants: PermissionGrant[],
    readonly isActive: boolean,
    readonly requiresTwoFactor: boolean,
  ) {
    const byKey = new Map<string, PermissionScope[]>();
    for (const g of grants) byKey.set(g.key, [...(byKey.get(g.key) ?? []), g.scope]);
    this.scopes = new Map(
      [...byKey].map(([key, list]) => [key, widestScope(list) as PermissionScope]),
    );
  }

  has(key: string): boolean {
    return this.scopes.has(key);
  }

  scopeOf(key: string): PermissionScope | null {
    return this.scopes.get(key) ?? null;
  }

  grants(): PermissionGrant[] {
    return [...this.scopes].map(([key, scope]) => ({ key, scope }));
  }

  /** Null when the user has no grant for the key (callers then return 403/404). */
  filterFor(key: string): ScopeFilter | null {
    const scope = this.scopeOf(key);
    if (!scope) return null;
    const unitByScope: Record<PermissionScope, string | null | undefined> = {
      own: null,
      team: this.placement.teamId,
      department: this.placement.departmentId,
      branch: this.placement.branchId,
      company: null,
    };
    return { scope, userId: this.userId, unitId: unitByScope[scope] ?? null };
  }
}
