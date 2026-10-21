import { type PermissionGrant, type PermissionScope, widestScope } from '@arweqah-platform/shared';

/** Where an employee sits: company, org unit and direct manager. Null before the employee is placed. */
export interface Placement {
  companyId: string | null;
  orgNodeId: string | null;
  managerId: string | null;
}

export const NO_PLACEMENT: Placement = { companyId: null, orgNodeId: null, managerId: null };

/** The organizational coordinates of a record, used to check a scoped grant. */
export interface ScopedResource {
  ownerId?: string | null;
  companyId?: string | null;
  orgNodeId?: string | null;
}

/** Filter a list query must apply for a permission at the user's widest scope. */
export interface ScopeFilter {
  scope: PermissionScope;
  userId: string;
  companyId: string | null;
  orgNodeId: string | null;
}

/** Immutable snapshot of what a user may do, built once per request. */
export class AccessContext {
  private readonly scopes: Map<string, PermissionScope>;

  constructor(
    readonly userId: string,
    readonly placement: Placement,
    grants: PermissionGrant[],
    readonly isActive: boolean,
    /** The user's org unit and every unit below it, for subtree-scoped record checks. */
    readonly subtreeNodeIds: readonly string[] = [],
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
    return { scope, userId: this.userId, companyId: this.placement.companyId, orgNodeId: this.placement.orgNodeId };
  }
}
