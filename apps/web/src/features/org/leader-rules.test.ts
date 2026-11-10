import { describe, expect, it } from 'vitest';
import { leaderCompanies, leaderFormValid, toSetLeaderInput, windowProblem, type LeaderForm } from './leader-rules';

const TODAY = '2026-11-05';
const form = (over: Partial<LeaderForm> = {}): LeaderForm => ({ companyId: 'c1', employeeId: 'e1', kind: 'leader', jobTitleId: 't1', validFrom: TODAY, validTo: '', reason: 'تعيين جديد', ...over });

describe('Who may be set as a leader (FR-100)', () => {
  const companies = [{ id: 'group' }, { id: 'c2' }];

  it('offers only the group company for a shared unit', () => {
    expect(leaderCompanies('shared', 'group', companies)).toEqual([{ id: 'group' }]);
  });

  it('offers every company for a unit managed per company', () => {
    expect(leaderCompanies('per_company', 'group', companies)).toHaveLength(2);
  });
});

describe('The dates of a leader (FR-100)', () => {
  it('accepts today and a leader with no end', () => {
    expect(windowProblem(form(), TODAY)).toBeUndefined();
  });

  it('refuses a start in the past', () => {
    expect(windowProblem(form({ validFrom: '2026-11-04' }), TODAY)).toBe('fromPast');
  });

  it('needs an end date for an acting leader', () => {
    expect(windowProblem(form({ kind: 'acting' }), TODAY)).toBe('toNeeded');
    expect(windowProblem(form({ kind: 'acting', validTo: '2026-12-01' }), TODAY)).toBeUndefined();
  });

  it('refuses an end before the start', () => {
    expect(windowProblem(form({ validFrom: '2026-12-01', validTo: '2026-11-20' }), TODAY)).toBe('toBeforeFrom');
  });
});

describe('The leader form (FR-100)', () => {
  it('needs the company, the employee and a reason of three letters', () => {
    expect(leaderFormValid(form(), TODAY)).toBe(true);
    expect(leaderFormValid(form({ companyId: null }), TODAY)).toBe(false);
    expect(leaderFormValid(form({ employeeId: null }), TODAY)).toBe(false);
    expect(leaderFormValid(form({ reason: 'ab' }), TODAY)).toBe(false);
  });

  it('needs the title a leader takes, but not for an acting leader who stays where they are', () => {
    expect(leaderFormValid(form({ jobTitleId: null }), TODAY)).toBe(false);
    expect(leaderFormValid(form({ kind: 'acting', jobTitleId: null, validTo: '2026-12-01' }), TODAY)).toBe(true);
    expect(toSetLeaderInput(form({ kind: 'acting', validTo: '2026-12-01' }))).not.toHaveProperty('jobTitleId');
  });

  it('writes an empty end as null and trims the reason', () => {
    expect(toSetLeaderInput(form({ reason: '  سبب  ' }))).toEqual({ companyId: 'c1', employeeId: 'e1', kind: 'leader', jobTitleId: 't1', validFrom: TODAY, validTo: null, reason: 'سبب' });
  });
});
