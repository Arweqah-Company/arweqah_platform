import {
  MAX_SCOPE_DEPTH,
  SCOPE_ORDER,
  baseScopeOf,
  depthScope,
  isPermissionScope,
  isTreeScope,
  offeredScopes,
  permissionScopeSchema,
  scopeDepth,
  scopeRank,
  widestScope,
} from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';

describe('Permission scopes with a depth (FR-06, FR-80)', () => {
  it('orders the scopes from the narrowest to the widest, the depths between the unit and everything below it', () => {
    expect([...SCOPE_ORDER]).toEqual(['own', 'unit', 'subtree:1', 'subtree:2', 'subtree:3', 'subtree:4', 'subtree:5', 'subtree', 'company', 'all']);
    expect(scopeRank('unit')).toBeLessThan(scopeRank('subtree:1'));
    expect(scopeRank('subtree:5')).toBeLessThan(scopeRank('subtree'));
    expect(scopeRank('subtree')).toBeLessThan(scopeRank('company'));
    expect(widestScope(['unit', 'subtree:3', 'subtree:1'])).toBe('subtree:3');
    expect(widestScope(['subtree:5', 'subtree'])).toBe('subtree');
    expect(widestScope([])).toBeNull();
  });

  it('knows which scopes are about units and how deep they go', () => {
    expect(scopeDepth('unit')).toBe(0);
    expect(scopeDepth('subtree:2')).toBe(2);
    expect(scopeDepth('subtree')).toBeNull();
    expect(scopeDepth('company')).toBeUndefined();
    expect(scopeDepth('own')).toBeUndefined();
    expect(isTreeScope('subtree:1')).toBe(true);
    expect(isTreeScope('company')).toBe(false);
    expect(baseScopeOf('subtree:4')).toBe('subtree');
    expect(baseScopeOf('unit')).toBe('unit');
    expect(depthScope(3)).toBe('subtree:3');
  });

  it('accepts only the scopes that exist, and no depth outside 1 to the maximum', () => {
    for (const ok of ['own', 'unit', 'subtree', 'company', 'all', 'subtree:1', `subtree:${MAX_SCOPE_DEPTH}`]) {
      expect(isPermissionScope(ok)).toBe(true);
      expect(permissionScopeSchema.safeParse(ok).success).toBe(true);
    }
    for (const bad of ['subtree:0', `subtree:${MAX_SCOPE_DEPTH + 1}`, 'subtree:', 'subtree:a', 'unit:1', 'galaxy', '', 5, null]) {
      expect(isPermissionScope(bad)).toBe(false);
      expect(permissionScopeSchema.safeParse(bad).success).toBe(false);
    }
  });

  it('offers the depths for a permission that allows subtree, and only what is allowed otherwise', () => {
    expect(offeredScopes(['unit', 'subtree', 'company', 'all'])).toEqual(['unit', 'subtree:1', 'subtree:2', 'subtree:3', 'subtree:4', 'subtree:5', 'subtree', 'company', 'all']);
    expect(offeredScopes(['unit', 'company'])).toEqual(['unit', 'company']);
    expect(offeredScopes(['company', 'all'])).toEqual(['company', 'all']);
    expect(offeredScopes(['all'])).toEqual(['all']);
  });
});
