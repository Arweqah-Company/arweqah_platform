import { describe, expect, it } from 'vitest';
import { CYCLE_DATE_KEYS, type CycleDate } from '@arweqah-platform/shared';
import { dateProblems, withDate } from './cycle-dates.rules';

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
