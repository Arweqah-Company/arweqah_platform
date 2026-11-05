import { afterEach, describe, expect, it, vi } from 'vitest';
import { levels, N, orgNodes, orgTree, treeNode } from '../../../test/org-fixtures';
import { allowedLevels, effectiveModeOf, parentChoices, resolveMode, suggestCode } from './add-unit-rules';
import { buildModel, distribution, inTreeOrder, isScheduled, pathOf, subtreeOfCompany, unitMatches } from './org-model';

describe('Structure model: tree order, paths and counts (FR-96)', () => {
  it('lists each unit after its parent with its depth', () => {
    expect(inTreeOrder(orgNodes).map(({ node, depth }) => [node.id, depth])).toEqual([[N.sector, 0], [N.office, 1], [N.dept, 1], [N.section, 2], [N.unit, 3], [N.legacy, 1]]);
  });

  it('treats a unit whose parent is not in the list as a top unit (the team view leaves some out)', () => {
    expect(inTreeOrder(orgNodes.filter((n) => n.id !== N.dept)).map((r) => [r.node.id, r.depth]).filter(([id]) => id === N.section)).toEqual([[N.section, 0]]);
  });

  it('gives the path from the top down to a unit', () => {
    const byId = new Map(orgNodes.map((n) => [n.id, n]));
    expect(pathOf(byId, byId.get(N.unit)!).map((n) => n.id)).toEqual([N.sector, N.dept, N.section, N.unit]);
  });

  it('sums the employees of one company in a unit and under it', () => {
    const nodes = [treeNode('a', 'sector', null, 'أ', { staffByCompany: { c1: 1, c2: 2 } }), treeNode('b', 'department', 'a', 'ب', { staffByCompany: { c1: 3 } })];
    expect(subtreeOfCompany(nodes, 'c1').get('a')).toBe(4);
    expect(subtreeOfCompany(nodes, 'c2').get('a')).toBe(2);
    expect(distribution(nodes, 'a')).toEqual({ c1: 4, c2: 2 });
    expect(distribution(nodes, 'b')).toEqual({ c1: 3 });
    expect(distribution(orgNodes, N.sector)).toBeNull(); // the team view has no per-company numbers
  });
});

describe('Structure model: search and filters (FR-96)', () => {
  const find = (id: string) => orgNodes.find((n) => n.id === id)!;

  it('searches the name, the code and the names of titles', () => {
    expect(unitMatches(find(N.unit), 'التوظيف', {})).toBe(true);
    expect(unitMatches(find(N.unit), 'ops.03.01.01', {})).toBe(true);
    expect(unitMatches(find(N.section), 'hr specialist', {})).toBe(true);
    expect(unitMatches(find(N.unit), 'غير موجود', {})).toBe(false);
  });

  it('filters by type, mode, status, employees and leader together', () => {
    expect(unitMatches(find(N.office), '', { level: 'lv-office', mode: 'per_company', employees: 'with', manager: 'with' })).toBe(true);
    expect(unitMatches(find(N.office), '', { mode: 'shared' })).toBe(false);
    expect(unitMatches(find(N.legacy), '', { status: 'noleader' })).toBe(true);
    expect(unitMatches(find(N.sector), '', { status: 'empty' })).toBe(false);
    expect(unitMatches(find(N.sector), '', { employees: 'without' })).toBe(true);
  });

  it('keeps the matching units and the units above them, and counts the compared company only', () => {
    const model = buildModel(orgTree(), 'التوظيف', {}, undefined);
    expect([...model.kept].sort()).toEqual([N.dept, N.section, N.sector, N.unit].sort());
    expect(model.rows.map((r) => r.node.id)).toEqual([N.sector, N.dept, N.section, N.unit]);
    expect(model.matching.has(N.sector)).toBe(false);
    const full = orgTree({ view: 'full', nodes: [treeNode('a', 'sector', null, 'أ', { staffByCompany: { c1: 2, c2: 5 }, subtreeStaffCount: 7 })] });
    expect(buildModel(full, '', {}, undefined).total).toBe(7);
    expect(buildModel(full, '', {}, 'c2').total).toBe(5);
  });
});

describe('Add unit rules (FR-96, FR-97)', () => {
  const t = orgTree();
  const node = (id: string) => orgNodes.find((n) => n.id === id)!;
  const level = (key: string) => levels.find((l) => l.key === key);

  it('allows under each parent what the table allows', () => {
    expect(allowedLevels(t, null).map((l) => l.key)).toEqual(['sector', 'department', 'office']);
    expect(allowedLevels(t, node(N.office)).map((l) => l.key)).toEqual(['section', 'unit']);
    expect(allowedLevels(t, node(N.unit))).toEqual([]);
  });

  it('offers as parents the group and the active units that can hold something', () => {
    expect(parentChoices(t).map((c) => c.node?.id ?? 'root')).toEqual(['root', N.sector, N.office, N.dept, N.section]);
  });

  it('suggests the next code in the slot of the type, an office the highest free number from 09, and the typed letters under the group', () => {
    expect(suggestCode(t, node(N.section), level('unit'), '')).toEqual({ code: 'OPS.03.01.02', problem: null });
    expect(suggestCode(t, node(N.sector), level('office'), '')).toEqual({ code: 'OPS.08.00.00', problem: null }); // OPS.09 is taken, so the next number down
    expect(suggestCode(t, node(N.sector), level('section'), '')).toEqual({ code: 'OPS.00.01.00', problem: null }); // a section directly under a sector: the department slot stays 00
    expect(suggestCode(t, node(N.dept), level('section'), '')).toEqual({ code: 'OPS.03.02.00', problem: null });
    expect(suggestCode(t, node(N.section), level('section'), '')).toEqual({ code: null, problem: 'noSlot' }); // the slot is taken by the parent itself
    expect(suggestCode(t, null, level('sector'), 'GRW')).toEqual({ code: 'GRW.00.00.00', problem: null });
    expect(suggestCode(t, null, level('sector'), 'gr')).toEqual({ code: null, problem: 'prefix' });
    expect(suggestCode(t, treeNode('x', 'section', N.sector, 'قسم'), level('unit'), '')).toEqual({ code: null, problem: 'parentNoCode' });
  });

  it('decides how a unit is managed: a unit under the group must choose, any other inherits by default', () => {
    expect(resolveMode(true, 'inherit')).toBe('');
    expect(resolveMode(true, 'shared')).toBe('shared');
    expect(resolveMode(false, '')).toBe('inherit');
    expect(effectiveModeOf(node(N.section), 'inherit')).toBe('shared');
    expect(effectiveModeOf(null, 'per_company')).toBe('per_company');
    expect(effectiveModeOf(null, '')).toBeNull();
  });
});

describe('Structure model: «today» is the Riyadh day, not the UTC day (CodeRabbit, PR 52)', () => {
  afterEach(() => vi.useRealTimers());

  it('treats a unit that starts on the Riyadh day as in force, even while UTC is still on the previous day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-05T22:30:00Z')); // 01:30 on 6 November in Riyadh
    const startsToday = treeNode('x', 'unit', null, 'س', { startDate: '2026-11-06', hasScheduledChange: false });
    const startsTomorrow = treeNode('y', 'unit', null, 'ص', { startDate: '2026-11-07', hasScheduledChange: false });
    expect(isScheduled(startsToday)).toBe(false);
    expect(isScheduled(startsTomorrow)).toBe(true);
  });
});
