import { describe, expect, it } from 'vitest';
import { resolveManagerChain, type ChainTitle } from './org-manager-chain.rules';

const t = (id: string, upId: string | null, mode: ChainTitle['mode'], holders: Record<string, number>): ChainTitle => ({ id, upId, mode, holders });
const titles = new Map<string, ChainTitle>([
  ['ceo', t('ceo', null, 'shared', { arw: 1 })],
  ['ops-director', t('ops-director', 'ceo', 'shared', { arw: 1 })],
  ['unit-head', t('unit-head', 'ops-director', 'shared', { arw: 1 })],
  ['team-lead', t('team-lead', 'unit-head', 'shared', {})],
  ['analyst', t('analyst', 'team-lead', 'shared', { arw: 3, tri: 1 })],
  ['growth-director', t('growth-director', 'ceo', 'per_company', { arw: 1, tri: 1 })],
  ['sales-manager', t('sales-manager', 'growth-director', 'per_company', { arw: 1, tri: 1 })],
  ['sales-rep', t('sales-rep', 'sales-manager', 'per_company', { arw: 3, tri: 2, byd: 2 })],
  ['marketing-rep', t('marketing-rep', 'growth-director', 'per_company', { tdw: 4 })],
]);
const start = (titleId: string, company: string) => ({ titleId, company, groupCompany: 'arw' });

describe('manager by the nearest occupied higher title (FR-100)', () => {
  it('skips a vacant title and finds the next one', () => {
    const r = resolveManagerChain(titles, start('analyst', 'arw'));
    expect(r.steps.map((s) => [s.titleId, s.state])).toEqual([['team-lead', 'vacant'], ['unit-head', 'found']]);
    expect(r.managerTitleId).toBe('unit-head');
  });

  it('looks among the holders of the group company for an employee of a shared unit, whatever their company', () => {
    expect(resolveManagerChain(titles, start('analyst', 'tri')).managerTitleId).toBe('unit-head');
  });

  it('looks among the holders of the employee\'s own company in a per-company unit', () => {
    expect(resolveManagerChain(titles, start('sales-rep', 'tri')).managerTitleId).toBe('sales-manager');
  });

  it('leaves the manager empty when the company has nobody above, and never crosses into another company', () => {
    const byd = resolveManagerChain(titles, start('sales-rep', 'byd'));
    expect(byd.managerTitleId).toBeNull();
    expect(byd.steps.map((s) => s.state)).toEqual(['vacant', 'vacant', 'blocked']);
    expect(resolveManagerChain(titles, start('marketing-rep', 'tdw')).steps.at(-1)?.state).toBe('blocked');
  });

  it('lets an employee of the group company climb out of a per-company unit into a shared one', () => {
    const noGroupDirector = new Map(titles).set('growth-director', t('growth-director', 'ceo', 'per_company', { tri: 1 }));
    expect(resolveManagerChain(noGroupDirector, start('marketing-rep', 'arw')).managerTitleId).toBe('ceo');
    expect(resolveManagerChain(noGroupDirector, start('marketing-rep', 'tdw')).steps.at(-1)?.state).toBe('blocked');
  });

  it('returns nothing for an unknown title and stops on a cycle', () => {
    expect(resolveManagerChain(titles, start('nope', 'arw'))).toEqual({ steps: [], managerTitleId: null });
    const loop = new Map<string, ChainTitle>([['a', t('a', 'b', 'shared', {})], ['b', t('b', 'a', 'shared', {})]]);
    expect(resolveManagerChain(loop, start('a', 'arw')).managerTitleId).toBeNull();
  });
});
