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
  /** Units the person manages (they hold the head role of the unit's level): added to the unit and subtree scopes beside where they sit. */
  managedUnitIds: readonly string[];
  /** Those units and every unit below them. */
  managedSubtreeIds: readonly string[];
}

/** The units a person manages, for the head roles of the levels: the units themselves and everything below them. */
export interface ManagedUnits {
  unitIds: readonly string[];
  subtreeIds: readonly string[];
}

export const NO_MANAGED_UNITS: ManagedUnits = { unitIds: [], subtreeIds: [] };

/** Where a granted permission reaches in the organization, for lists (SQL) and for records the person did not create. */
export type NodeScope = { kind: 'none' } | { kind: 'nodes'; ids: readonly string[] } | { kind: 'company'; companyId: string } | { kind: 'all' };

/** The place of a record in the organization. */
export interface OrgPlace {
  orgNodeId: string | null;
  companyId: string | null;
}

/** Immutable snapshot of what a user may do, built once per request. */
export class AccessContext {
  private readonly scopes: Map<string, PermissionScope>;

  constructor(
    readonly userId: string,
    readonly placement: Placement,
    grants: PermissionGrant[],
    readonly isActive: boolean,
    /** The user's org unit and every unit below it. */
    private readonly placementSubtreeNodeIds: readonly string[] = [],
    /** Units the person manages through a head role (the scope of a head role comes from the units its holder manages, beside where they sit). */
    private readonly managed: ManagedUnits = NO_MANAGED_UNITS,
  ) {
    const byKey = new Map<string, PermissionScope[]>();
    for (const g of grants) byKey.set(g.key, [...(byKey.get(g.key) ?? []), g.scope]);
    this.scopes = new Map(
      [...byKey].map(([key, list]) => [key, widestScope(list) as PermissionScope]),
    );
  }

  /** Where the person sits and the units they manage (unit scope). */
  get unitNodeIds(): readonly string[] {
    const { orgNodeId } = this.placement;
    return [...new Set([...(orgNodeId ? [orgNodeId] : []), ...this.managed.unitIds])];
  }

  /** The units the person sits in or manages, and everything below them (subtree scope). */
  get subtreeNodeIds(): readonly string[] {
    return [...new Set([...this.placementSubtreeNodeIds, ...this.managed.subtreeIds])];
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

  /** Where the permission reaches beyond the person's own records: nothing (own), their unit, their unit and below, their company, or everything. */
  nodeScopeOf(key: string): NodeScope {
    const { companyId } = this.placement;
    switch (this.scopeOf(key)) {
      case 'all':
        return { kind: 'all' };
      case 'company':
        return companyId ? { kind: 'company', companyId } : { kind: 'none' };
      case 'subtree':
        return this.subtreeNodeIds.length ? { kind: 'nodes', ids: this.subtreeNodeIds } : { kind: 'none' };
      case 'unit':
        return this.unitNodeIds.length ? { kind: 'nodes', ids: this.unitNodeIds } : { kind: 'none' };
      default:
        return { kind: 'none' };
    }
  }

  /** True when the place (a department, or where a person sits) is inside what the permission reaches. */
  reaches(key: string, place: OrgPlace): boolean {
    return nodeScopeIncludes(this.nodeScopeOf(key), place);
  }

  /** Null when the user has no grant for the key (callers then return 403/404). */
  filterFor(key: string): ScopeFilter | null {
    const scope = this.scopeOf(key);
    if (!scope) return null;
    return { scope, userId: this.userId, companyId: this.placement.companyId, orgNodeId: this.placement.orgNodeId, managedUnitIds: this.managed.unitIds, managedSubtreeIds: this.managed.subtreeIds };
  }
}

/** Is the place inside the scope? (`all` includes even a place that is not known.) */
export function nodeScopeIncludes(scope: NodeScope, place: OrgPlace): boolean {
  switch (scope.kind) {
    case 'all':
      return true;
    case 'company':
      return place.companyId === scope.companyId;
    case 'nodes':
      return !!place.orgNodeId && scope.ids.includes(place.orgNodeId);
    default:
      return false;
  }
}
