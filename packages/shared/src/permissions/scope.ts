/**
 * How far a granted permission reaches. Ordered from narrowest to widest:
 * a grant at a wider scope includes every narrower one.
 */
export const PERMISSION_SCOPES = ['own', 'team', 'department', 'branch', 'company'] as const;
export type PermissionScope = (typeof PERMISSION_SCOPES)[number];

export const scopeRank = (scope: PermissionScope): number => PERMISSION_SCOPES.indexOf(scope);

export const widestScope = (scopes: PermissionScope[]): PermissionScope | null =>
  scopes.reduce<PermissionScope | null>(
    (widest, s) => (widest === null || scopeRank(s) > scopeRank(widest) ? s : widest),
    null,
  );
