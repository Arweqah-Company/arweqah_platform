import { describe, expect, it } from 'vitest';
import { CYCLE_DATE_KEYS, conflictDate, dateProblems, withDate, type CycleDate } from '@arweqah-platform/shared';
import { defaultCycleDates, effectiveDates, nextFiscalYear } from './cycle-dates.rules';

const d = (key: CycleDate['key'], from: string, to: string | null = null): CycleDate => ({ key, from, to });
const SET = [d('final', '2027-04-15', '2027-04-20'), d('calibration', '2027-04-21', '2027-04-24'), d('approval', '2027-04-27'), d('notification', '2027-04-30'), d('objection', '2027-05-03', '2027-05-07')];

describe('dateProblems (FR-118)', () => {
  it('accepts a date that fits where it stands', () => {
    expect(dateProblems(SET, d('calibration', '2027-04-22', '2027-04-25'))).toEqual([]);
    expect(dateProblems([], d('approval', '2027-04-27'))).toEqual([]);
  });

  it('refuses an end before the start', () => {
    expect(dateProblems(SET, d('approval', '2027-04-28', '2027-04-27'))).toContain('end_before_start');
  });

  it('refuses a date that starts before the stage ahead of it ends, or ends after the one behind it starts', () => {
    expect(dateProblems(SET, d('calibration', '2027-04-19', '2027-04-22'))).toContain('before_previous');
    expect(dateProblems(SET, d('calibration', '2027-04-21', '2027-04-28'))).toContain('after_next');
  });

  it('skips a chain date that is not set yet instead of guessing it', () => {
    expect(dateProblems([d('final', '2027-04-15', '2027-04-20')], d('approval', '2027-04-27'))).toEqual([]);
    expect(dateProblems([d('final', '2027-04-15', '2027-04-20')], d('approval', '2027-04-18'))).toContain('before_previous');
  });

  it('keeps the self-evaluation deadline no later than the close of the qualitative part, and leaves them outside the chain', () => {
    const close = [d('qualitative_close', '2027-03-25')];
    expect(dateProblems(close, d('self_deadline', '2027-03-10'))).toEqual([]);
    expect(dateProblems(close, d('self_deadline', '2027-03-26'))).toContain('after_next');
    expect(dateProblems([d('self_deadline', '2027-03-10')], d('qualitative_close', '2027-03-01'))).toContain('before_previous');
    expect(dateProblems(SET, d('self_deadline', '2020-01-01'))).toEqual([]);
  });
});

describe('withDate', () => {
  it('replaces the date with the same key and keeps the order of the keys', () => {
    const out = withDate(SET, d('approval', '2027-04-28'), CYCLE_DATE_KEYS);
    expect(out.map((x) => x.key)).toEqual(['final', 'calibration', 'approval', 'notification', 'objection']);
    expect(out[2]!.from).toBe('2027-04-28');
    expect(withDate([], d('qualitative_close', '2027-03-25'), CYCLE_DATE_KEYS)).toHaveLength(1);
  });
});

describe('defaultCycleDates and effectiveDates (FR-118, plan §3.7b)', () => {
  it('gives all seven dates of the fiscal year, in the order of the keys, in the year after it begins', () => {
    const usual = defaultCycleDates(2026);
    expect(usual.map((x) => x.key)).toEqual([...CYCLE_DATE_KEYS]);
    expect(usual.find((x) => x.key === 'calibration')).toEqual(d('calibration', '2027-04-21', '2027-04-24'));
    expect(usual.find((x) => x.key === 'self_deadline')).toEqual(d('self_deadline', '2027-03-10'));
    expect(usual.find((x) => x.key === 'objection')).toEqual(d('objection', '2027-05-03', '2027-05-07'));
  });

  it('keeps the usual dates consistent with the rule that checks the others (no date refuses its neighbours)', () => {
    const usual = defaultCycleDates(2026);
    for (const date of usual) expect(dateProblems(usual, date)).toEqual([]);
  });

  it('takes what was set for a key and the usual date for the others', () => {
    const out = effectiveDates([d('approval', '2027-04-28')], 2026);
    expect(out).toHaveLength(7);
    expect(out.find((x) => x.key === 'approval')).toEqual(d('approval', '2027-04-28'));
    expect(out.find((x) => x.key === 'final')).toEqual(d('final', '2027-04-15', '2027-04-20'));
  });
});

describe('nextFiscalYear', () => {
  it('is the year whose April began last: from April it is this year, before April the one before', () => {
    expect(nextFiscalYear('2026-11-09')).toBe(2026);
    expect(nextFiscalYear('2027-03-31')).toBe(2026);
    expect(nextFiscalYear('2027-04-01')).toBe(2027);
    expect(nextFiscalYear('2027-01-15')).toBe(2026);
  });
});

describe('conflictDate', () => {
  it('names the day a refused date runs into: where the stage ahead ends, or where the one behind starts', () => {
    expect(conflictDate(SET, d('calibration', '2027-04-10'), 'before_previous')).toBe('2027-04-20');
    expect(conflictDate(SET, d('calibration', '2027-04-21', '2027-04-28'), 'after_next')).toBe('2027-04-27');
  });

  it('names the other of the deadline and the close of the qualitative part, and nothing for another problem', () => {
    const pair = [d('self_deadline', '2027-03-10'), d('qualitative_close', '2027-03-25')];
    expect(conflictDate(pair, d('self_deadline', '2027-03-26'), 'after_next')).toBe('2027-03-25');
    expect(conflictDate(pair, d('qualitative_close', '2027-03-01'), 'before_previous')).toBe('2027-03-10');
    expect(conflictDate(SET, d('approval', '2027-04-28', '2027-04-27'), 'end_before_start')).toBeNull();
  });
});
