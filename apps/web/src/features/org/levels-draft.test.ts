import { describe, expect, it } from 'vitest';
import { levelsDto } from '../../../test/org-fixtures';
import { addType, arabicNameProblem, draftFrom, isDraftValid, isFixedPair, patchType, removeType, rulesForSave, setPair, toggleRow, toTypeInputs } from './levels-draft';

describe('Divisions draft (FR-96)', () => {
  const draft = draftFrom(levelsDto);

  it('knows the two fixed rules', () => {
    expect(isFixedPair('root', 'sector')).toBe(false);
    expect(isFixedPair('department', 'sector')).toBe(true);
    expect(isFixedPair('office', 'office')).toBe(true);
    expect(isFixedPair('office', 'unit')).toBe(false);
  });

  it('adds a division with a temporary key and removes it with every mention in the table', () => {
    const added = setPair(addType(draft, 1), 'root', 'new-1', true);
    expect(added.rules['new-1']).toEqual([]);
    expect(added.rules.root).toContain('new-1');
    const removed = removeType(added, 'new-1');
    expect(removed.types).toHaveLength(5);
    expect(removed.rules).not.toHaveProperty('new-1');
    expect(removed.rules.root).not.toContain('new-1');
  });

  it('ticks and unticks a row, never a fixed pair', () => {
    const full = toggleRow(draft, 'section');
    expect(full.rules.section).not.toContain('sector');
    expect(full.rules.section).toContain('section');
    expect(toggleRow(full, 'section').rules.section).toEqual([]);
  });

  it('requires an Arabic name, unique among the types, and an English one', () => {
    const added = addType(draft, 1);
    expect(arabicNameProblem(added, 'new-1')).toBe('required');
    expect(arabicNameProblem(patchType(added, 'new-1', { nameAr: 'قطاع' }), 'new-1')).toBe('duplicate');
    const named = patchType(added, 'new-1', { nameAr: 'فرع' });
    expect(isDraftValid(named)).toBe(false); // no English name yet
    expect(isDraftValid(patchType(named, 'new-1', { nameEn: 'Branch' }))).toBe(true);
  });

  it('sends the types without keys, and the rules with the keys the server gave', () => {
    const named = patchType(patchType(setPair(addType(draft, 7), 'section', 'new-7', true), 'new-7', { nameAr: ' فرع ' }), 'new-7', { nameEn: 'Branch' });
    const inputs = toTypeInputs(named);
    expect(inputs.at(-1)).toEqual({ nameAr: 'فرع', nameEn: 'Branch', acceptsTitles: true });
    expect(inputs[0]).toHaveProperty('id');
    const saved = [...levelsDto.levels, { ...levelsDto.levels[3]!, id: 'real', key: 'branch', nameAr: 'فرع' }];
    const rules = rulesForSave(named, saved);
    expect(rules.section).toContain('branch');
    expect(rules.branch).toEqual([]);
    expect(rules.root).toEqual(levelsDto.rules.root);
  });
});
