import { describe, expect, it } from 'vitest';
import { effectiveModes, visibleUnitIds, type StaffByUnit, type VisibilityNode } from './org-visibility.rules';

/**
 * ops (per company)            ├ office (arw 1)
 *                              ├ shared-services dept (shared) ├ finance (arw 3, tri 2) └ procurement (nobody)
 * growth (per company)         ├ sales (arw 1, tri 1)  └ marketing (tdw 4)
 */
const nodes: VisibilityNode[] = [
  { id: 'ops', parentId: null, mode: 'per_company' },
  { id: 'office', parentId: 'ops', mode: null },
  { id: 'shared', parentId: 'ops', mode: 'shared' },
  { id: 'finance', parentId: 'shared', mode: null },
  { id: 'procurement', parentId: 'shared', mode: null },
  { id: 'growth', parentId: null, mode: 'per_company' },
  { id: 'sales', parentId: 'growth', mode: null },
  { id: 'marketing', parentId: 'growth', mode: null },
];
const staff: StaffByUnit = new Map([
  ['office', new Map([['arw', 1]])],
  ['finance', new Map([['arw', 3], ['tri', 2]])],
  ['sales', new Map([['arw', 1], ['tri', 1]])],
  ['marketing', new Map([['tdw', 4]])],
]);

describe('who sees which unit (FR-98)', () => {
  it('inherits the management mode from the closest ancestor with one', () => {
    const modes = effectiveModes(nodes);
    expect(modes.get('finance')).toBe('shared');
    expect(modes.get('office')).toBe('per_company');
    expect(effectiveModes([{ id: 'x', parentId: null, mode: null }]).get('x')).toBe('per_company');
  });

  it('shows a company its own units, the units above them, and shared units that have anyone in them', () => {
    const tdw = visibleUnitIds(nodes, staff, 'tdw');
    expect([...tdw].sort()).toEqual(['finance', 'growth', 'marketing', 'ops', 'shared']);
  });

  it('hides a shared unit nobody works in, and a per-company unit with no employee of the company', () => {
    const tri = visibleUnitIds(nodes, staff, 'tri');
    expect(tri.has('procurement')).toBe(false);
    expect(tri.has('office')).toBe(false);
    expect(tri.has('marketing')).toBe(false);
    expect(tri.has('sales')).toBe(true);
  });

  it('shows the units of the company and nothing of another company that has only its own people there', () => {
    const arw = visibleUnitIds(nodes, staff, 'arw');
    expect(arw.has('marketing')).toBe(false);
    expect(arw.has('office')).toBe(true);
  });

  it('shows nothing to a company with no employee anywhere and no staffed shared unit', () => {
    expect(visibleUnitIds(nodes.filter((n) => n.id !== 'shared' && n.id !== 'finance' && n.id !== 'procurement'), staff, 'byd').size).toBe(0);
  });

  it('shows a shared branch to every company even when none of their people are in it', () => {
    expect(visibleUnitIds(nodes, staff, 'byd').has('finance')).toBe(true);
  });
});
