import { describe, expect, it } from 'vitest';
import { assertValidRules, planLevels, type ExistingLevel } from './org-level-plan.rules';

const existing: ExistingLevel[] = [
  { id: 'a', key: 'sector', isBuiltIn: true, sortOrder: 1 },
  { id: 'b', key: 'department', isBuiltIn: true, sortOrder: 2 },
  { id: 'c', key: 'custom_x', isBuiltIn: false, sortOrder: 3 },
];
const keep = [
  { id: 'a', nameAr: 'قطاع', nameEn: 'Sector', acceptsTitles: false },
  { id: 'b', nameAr: 'إدارة', nameEn: 'Department', acceptsTitles: true },
];

describe('planLevels (FR-96)', () => {
  it('renames built-in types in place and removes an added type that is left out', () => {
    const plan = planLevels(existing, [{ ...keep[0]!, nameEn: 'Group' }, keep[1]!]);
    expect(plan.removeIds).toEqual(['c']);
    expect(plan.items.map((i) => [i.id, i.nameEn, i.sortOrder])).toEqual([['a', 'Group', 1], ['b', 'Department', 2]]);
  });

  it('appends an added type after the highest order', () => {
    const plan = planLevels(existing, [...keep, { id: 'c', nameAr: 'فرع', nameEn: 'Branch', acceptsTitles: true }, { nameAr: 'فريق', nameEn: 'Team', acceptsTitles: true }]);
    expect(plan.removeIds).toEqual([]);
    expect(plan.items.at(-1)).toMatchObject({ nameEn: 'Team', sortOrder: 4 });
    expect(plan.items.at(-1)?.id).toBeUndefined();
  });

  it('never removes a built-in type, never lets a sector take titles, and refuses unknown, repeated or same-named types', () => {
    expect(() => planLevels(existing, [keep[0]!])).toThrow(/cannot be removed/);
    expect(() => planLevels(existing, [{ ...keep[0]!, acceptsTitles: true }, keep[1]!, existing[2] as never])).toThrow();
    expect(() => planLevels(existing, [...keep, { id: 'zzz', nameAr: 'س', nameEn: 'X', acceptsTitles: true }])).toThrow(/does not exist/);
    expect(() => planLevels(existing, [keep[0]!, keep[0]!, keep[1]!])).toThrow(/twice/);
    expect(() => planLevels(existing, [...keep, { nameAr: 'إدارة', nameEn: 'Dup', acceptsTitles: true }])).toThrow(/two types/);
  });
});

describe('assertValidRules (FR-96)', () => {
  const keys = new Set(['sector', 'department', 'office']);

  it('accepts a table of known types', () => {
    expect(() => assertValidRules({ root: ['sector'], sector: ['department', 'office'] }, keys)).not.toThrow();
  });

  it('refuses unknown types and the two fixed rules', () => {
    expect(() => assertValidRules({ root: ['team'] }, keys)).toThrow(/Unknown child/);
    expect(() => assertValidRules({ team: ['sector'] }, keys)).toThrow(/Unknown parent/);
    expect(() => assertValidRules({ department: ['sector'] }, keys)).toThrow(/never allowed/);
    expect(() => assertValidRules({ office: ['office'] }, keys)).toThrow(/office>office/);
  });
});
