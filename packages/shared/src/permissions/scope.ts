import { z } from 'zod';

/**
 * How far a granted permission reaches. Ordered from narrowest to widest:
 * a grant at a wider scope includes every narrower one.
 *  - own:       the user's own record
 *  - unit:      records placed directly in the user's org unit (and the units they manage)
 *  - subtree:N: those units and N levels of units below them (N from 1 to MAX_SCOPE_DEPTH)
 *  - subtree:   those units and every unit below them
 *  - company:   every record of the user's company
 *  - all:       every company
 */
export const PERMISSION_SCOPES = ['own', 'unit', 'subtree', 'company', 'all'] as const;
export type BaseScope = (typeof PERMISSION_SCOPES)[number];

/** The most levels below a unit that a `subtree:N` scope can name. */
export const MAX_SCOPE_DEPTH = 5;
export type DepthScope = `subtree:${number}`;
export type PermissionScope = BaseScope | DepthScope;

// A literal (not built from MAX_SCOPE_DEPTH) so it can be checked as safe; a test keeps the two in step.
const DEPTH_SCOPE = /^subtree:([1-5])$/;

export const depthScope = (levels: number): DepthScope => `subtree:${levels}`;

export const isPermissionScope = (value: unknown): value is PermissionScope =>
  typeof value === 'string' && ((PERMISSION_SCOPES as readonly string[]).includes(value) || DEPTH_SCOPE.test(value));

/** The scope as one a permission definition lists: `subtree:2` is a kind of `subtree`. */
export const baseScopeOf = (scope: PermissionScope): BaseScope => (scope.startsWith('subtree:') ? 'subtree' : (scope as BaseScope));

/** Levels below the unit that a unit-based scope reaches: 0 for `unit`, N for `subtree:N`, null for no limit (`subtree`); undefined for the scopes that are not about units. */
export function scopeDepth(scope: PermissionScope): number | null | undefined {
  if (scope === 'unit') return 0;
  if (scope === 'subtree') return null;
  const match = DEPTH_SCOPE.exec(scope);
  return match ? Number(match[1]) : undefined;
}

/** Is it about the user's units and the units below them (not just themselves, nor a whole company)? */
export const isTreeScope = (scope: PermissionScope): boolean => scopeDepth(scope) !== undefined;

/** The levels the unit-based scopes can name, narrowest first: own, unit, then 1 to MAX levels below, then no limit, company, all. */
export const SCOPE_ORDER: readonly PermissionScope[] = [
  'own',
  'unit',
  ...Array.from({ length: MAX_SCOPE_DEPTH }, (_, i) => depthScope(i + 1)),
  'subtree',
  'company',
  'all',
];

export const scopeRank = (scope: PermissionScope): number => SCOPE_ORDER.indexOf(scope);

export const widestScope = (scopes: PermissionScope[]): PermissionScope | null =>
  scopes.reduce<PermissionScope | null>(
    (widest, s) => (widest === null || scopeRank(s) > scopeRank(widest) ? s : widest),
    null,
  );

/** The scopes a person can pick for a permission that allows `allowed`: `subtree` offers every depth too. */
export function offeredScopes(allowed: readonly PermissionScope[]): PermissionScope[] {
  return SCOPE_ORDER.filter((s) => allowed.includes(baseScopeOf(s)) && (baseScopeOf(s) !== 'subtree' || allowed.includes('subtree')));
}

/** The same rule as `isPermissionScope`, as a pattern so it can also be described in the API documentation. */
const SCOPE_PATTERN = /^(own|unit|subtree|company|all|subtree:[1-5])$/;
export const permissionScopeSchema = z.string().regex(SCOPE_PATTERN, 'Unknown scope') as unknown as z.ZodType<PermissionScope>;
