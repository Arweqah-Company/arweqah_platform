import { DEFAULT_PARENT_RULES } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { canCreateUnder, childTypesOf, fixedRuleViolations } from './org-unit-types.rules';

describe('org unit types (FR-96)', () => {
  it('lets a sector hold an office, sections or departments, and siblings need not match', () => {
    expect(canCreateUnder(DEFAULT_PARENT_RULES, 'sector', 'office')).toBe(true);
    expect(canCreateUnder(DEFAULT_PARENT_RULES, 'sector', 'section')).toBe(true);
    expect(canCreateUnder(DEFAULT_PARENT_RULES, 'sector', 'department')).toBe(true);
  });

  it('allows a department and an office directly under the root, but a sector only there', () => {
    expect(canCreateUnder(DEFAULT_PARENT_RULES, 'root', 'department')).toBe(true);
    expect(canCreateUnder(DEFAULT_PARENT_RULES, 'root', 'office')).toBe(true);
    expect(canCreateUnder(DEFAULT_PARENT_RULES, 'department', 'sector')).toBe(false);
  });

  it('never allows an office under an office or anything under a unit', () => {
    expect(canCreateUnder(DEFAULT_PARENT_RULES, 'office', 'office')).toBe(false);
    expect(childTypesOf(DEFAULT_PARENT_RULES, 'unit')).toEqual([]);
  });

  it('keeps the two fixed rules even when the stored table says otherwise', () => {
    const edited = { ...DEFAULT_PARENT_RULES, office: ['office', 'section'], section: ['sector', 'unit'] };
    expect(canCreateUnder(edited, 'office', 'office')).toBe(false);
    expect(canCreateUnder(edited, 'section', 'sector')).toBe(false);
    expect(childTypesOf(edited, 'office')).toEqual(['section']);
    expect(fixedRuleViolations(edited).sort()).toEqual(['office>office', 'section>sector']);
  });

  it('refuses a pair the table does not list', () => {
    expect(canCreateUnder(DEFAULT_PARENT_RULES, 'section', 'department')).toBe(false);
    expect(canCreateUnder({}, 'sector', 'office')).toBe(false);
  });
});
