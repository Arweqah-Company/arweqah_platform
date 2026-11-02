import { scopeDepth, type PermissionGrant, type PermissionScope, widestScope } from '@arweqah-platform/shared';

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
  /** The units a unit-based scope reaches (the person's own unit and the units they manage, and as many levels below as the scope allows); empty for the other scopes. */
  nodeIds: readonly string[];
}

/**
 * The units a person reaches, each with the fewest levels below one of their starting units: the unit they sit in and the units they manage through a head role are depth 0.
 * A scope with a depth takes the units up to that depth.
 */
export type UnitReach = ReadonlyMap<string, number>;

export const NO_REACH: UnitReach = new Map();

/** A reach from the rows of the unit closure: each unit with its depth below a starting unit (the smallest depth wins). */
export function reachFrom(rows: { nodeId: string; depth: number }[]): UnitReach {
  const reach = new Map<string, number>();
  for (const { nodeId, depth } of rows) reach.set(nodeId, Math.min(depth, reach.get(nodeId) ?? depth));
  return reach;
}

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
    /** The units the person reaches and how deep (their own unit and the units they manage, then those below). */
    private readonly reach: UnitReach = NO_REACH,
  ) {
    const byKey = new Map<string, PermissionScope[]>();
    for (const g of grants) byKey.set(g.key, [...(byKey.get(g.key) ?? []), g.scope]);
    this.scopes = new Map(
      [...byKey].map(([key, list]) => [key, widestScope(list) as PermissionScope]),
    );
  }

  /** The units a unit-based scope reaches: the person's own unit and the units they manage, and as many levels below them as the scope allows. */
  nodesFor(scope: PermissionScope): readonly string[] {
    const depth = scopeDepth(scope);
    if (depth === undefined) return [];
    return [...this.reach].filter(([, d]) => depth === null || d <= depth).map(([id]) => id);
  }

  /** The units the person sits in or manages, and everything below them. */
  get subtreeNodeIds(): readonly string[] {
    return this.nodesFor('subtree');
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
      case 'own':
      case null:
        return { kind: 'none' };
      default: {
        const ids = this.nodesFor(this.scopeOf(key) as PermissionScope);
        return ids.length ? { kind: 'nodes', ids } : { kind: 'none' };
      }
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
    return { scope, userId: this.userId, companyId: this.placement.companyId, nodeIds: this.nodesFor(scope) };
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
