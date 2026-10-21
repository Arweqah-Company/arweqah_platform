/**
 * How far a granted permission reaches. Ordered from narrowest to widest:
 * a grant at a wider scope includes every narrower one.
 *  - own:     the user's own record
 *  - unit:    records placed directly in the user's org unit
 *  - subtree: the user's org unit and every unit below it
 *  - company: every record of the user's company
 *  - all:     every company
 */
export const PERMISSION_SCOPES = ['own', 'unit', 'subtree', 'company', 'all'] as const;
export type PermissionScope = (typeof PERMISSION_SCOPES)[number];

export const scopeRank = (scope: PermissionScope): number => PERMISSION_SCOPES.indexOf(scope);

export const widestScope = (scopes: PermissionScope[]): PermissionScope | null =>
  scopes.reduce<PermissionScope | null>(
    (widest, s) => (widest === null || scopeRank(s) > scopeRank(widest) ? s : widest),
    null,
  );
