import { describe, expect, it } from 'vitest';
import {
  OrgActingIsLeaderError,
  OrgActingNeedsLeaderError,
  OrgActingOverlapError,
  OrgActingWindowError,
  OrgLeaderCompanyError,
  OrgLeaderDateNotAfterError,
  OrgLeaderInThePastError,
} from '../errors/org.errors';
import type { LeaderRow } from '../types/org-leader.types';
import { assertActing, assertLeaderCompany, escalateLeader, isActiveLeader, leaderStatus, planLeader, type LeaderChainUnit } from './org-leader.rules';

const TODAY = '2026-11-05';
/** `row('a', 'leader', 'e1', '2024-01-01', null)`: id, kind, employee, then the first day and the last day. */
const row = (id: string, kind: LeaderRow['kind'], employeeId: string, ...days: [from: string, to: string | null]): LeaderRow => ({ id, nodeId: 'n', companyId: 'arw', employeeId, kind, validFrom: days[0], validTo: days[1], reason: 'r', createdBy: null });

describe('leaders of a unit per company (FR-100)', () => {
  it('tells past, current and scheduled leaders apart', () => {
    expect(leaderStatus({ validFrom: '2024-01-01', validTo: '2026-11-04' }, TODAY)).toBe('past');
    expect(leaderStatus({ validFrom: '2024-01-01', validTo: null }, TODAY)).toBe('current');
    expect(isActiveLeader({ validFrom: '2026-11-06', validTo: null }, TODAY)).toBe(false);
  });

  it('leads a shared unit only from the group company; a unit managed per company from any company', () => {
    expect(() => assertLeaderCompany('shared', 'tri', 'arw')).toThrow(OrgLeaderCompanyError);
    expect(() => assertLeaderCompany('shared', 'arw', 'arw')).not.toThrow();
    expect(() => assertLeaderCompany('per_company', 'tri', 'arw')).not.toThrow();
  });
});

describe('a new leader and the one before (FR-100)', () => {
  it('closes the leader in force the day before the new one starts', () => {
    expect(planLeader([row('a', 'leader', 'e1', '2024-01-01', null)], { validFrom: '2026-12-01' }, TODAY)).toEqual({ close: [{ id: 'a', validTo: '2026-11-30' }], replaceIds: [] });
  });

  it('replaces a leader that starts the same day, refuses the past and a day before the last leader started', () => {
    expect(planLeader([row('a', 'leader', 'e1', '2026-12-01', null)], { validFrom: '2026-12-01' }, TODAY)).toEqual({ close: [], replaceIds: ['a'] });
    expect(() => planLeader([], { validFrom: '2026-11-04' }, TODAY)).toThrow(OrgLeaderInThePastError);
    expect(() => planLeader([row('a', 'leader', 'e1', '2026-12-01', null)], { validFrom: '2026-11-20' }, TODAY)).toThrow(OrgLeaderDateNotAfterError);
  });

  it('leaves acting leaders alone when the leader changes', () => {
    const rows = [row('a', 'leader', 'e1', '2024-01-01', null), row('x', 'acting', 'e2', '2026-11-05', '2026-11-30')];
    expect(planLeader(rows, { validFrom: '2026-12-01' }, TODAY).close.map((c) => c.id)).toEqual(['a']);
  });
});

describe('an acting leader (FR-100)', () => {
  const leader = row('a', 'leader', 'e1', '2024-01-01', null);
  const window = { kind: 'acting' as const, employeeId: 'e2', validFrom: '2026-11-10', validTo: '2026-11-20' };

  it('needs a window, a leader in force for all of it, someone else than the leader, and days no other acting leader holds', () => {
    expect(() => assertActing([leader], { ...window, validTo: null }, TODAY)).toThrow(OrgActingWindowError);
    expect(() => assertActing([], window, TODAY)).toThrow(OrgActingNeedsLeaderError);
    expect(() => assertActing([row('a', 'leader', 'e1', '2024-01-01', '2026-11-15')], window, TODAY)).toThrow(OrgActingNeedsLeaderError);
    expect(() => assertActing([leader], { ...window, employeeId: 'e1' }, TODAY)).toThrow(OrgActingIsLeaderError);
    expect(() => assertActing([leader, row('x', 'acting', 'e3', '2026-11-18', '2026-11-25')], window, TODAY)).toThrow(OrgActingOverlapError);
    expect(() => assertActing([leader], window, TODAY)).not.toThrow();
  });

  it('starts today or later', () => {
    expect(() => assertActing([leader], { ...window, validFrom: '2026-11-01' }, TODAY)).toThrow(OrgLeaderInThePastError);
  });
});

describe('where the manager goes when a company has no leader in the unit (FR-100)', () => {
  const unit = (id: string, parentId: string | null, shared: boolean, leaders: [string, string][] = []): [string, LeaderChainUnit] => [id, { nodeId: id, parentId, shared, leaders: new Map(leaders) }];
  const units = new Map<string, LeaderChainUnit>([
    unit('sector', null, false, [['tri', 'tri-head'], ['arw', 'arw-head']]),
    unit('dept', 'sector', false, [['arw', 'dept-head-arw']]),
    unit('section', 'dept', false),
    unit('shared-dept', 'sector', true, [['arw', 'shared-head']]),
    unit('shared-section', 'shared-dept', true),
  ]);

  it('climbs to the nearest unit above that has a leader for the company', () => {
    expect(escalateLeader(units, 'section', 'arw', 'arw')).toEqual({ nodeId: 'dept', employeeId: 'dept-head-arw' });
    expect(escalateLeader(units, 'section', 'tri', 'arw')).toEqual({ nodeId: 'sector', employeeId: 'tri-head' });
  });

  it('never leaves the company: nobody above leads for it, so nobody', () => {
    expect(escalateLeader(units, 'section', 'byd', 'arw')).toBeNull();
  });

  it('stops at a shared unit for an employee who is not of the group company, and finds the group leader for one who is', () => {
    const below = new Map(units).set('p-section', { nodeId: 'p-section', parentId: 'shared-dept', shared: false, leaders: new Map() });
    expect(escalateLeader(below, 'p-section', 'tri', 'arw')).toBeNull();
    expect(escalateLeader(below, 'p-section', 'arw', 'arw')).toEqual({ nodeId: 'shared-dept', employeeId: 'shared-head' });
  });

  it('looks for the group company\'s leader from a shared unit, whatever the employee\'s company', () => {
    expect(escalateLeader(units, 'shared-section', 'tri', 'arw')).toEqual({ nodeId: 'shared-dept', employeeId: 'shared-head' });
  });
});
