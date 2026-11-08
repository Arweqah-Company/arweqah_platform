import { describe, expect, it } from 'vitest';
import { acknowledgementState } from './acknowledgement.rules';

const day = (n: number) => new Date(Date.UTC(2026, 10, n));

describe('acknowledgement rules (FR-112)', () => {
  it('asks a person who never acknowledged anything, at their first sign-in', () => {
    expect(acknowledgementState({ latest: null, reopenedAt: null, everAcknowledged: false })).toEqual({ pending: true, reason: 'first' });
  });

  it('asks again when the title changed: they acknowledged before, but not this title', () => {
    expect(acknowledgementState({ latest: null, reopenedAt: null, everAcknowledged: true })).toEqual({ pending: true, reason: 'title' });
  });

  it('asks again when HR reopened the acknowledgement after theirs, and not when it was before', () => {
    expect(acknowledgementState({ latest: { acknowledgedAt: day(5) }, reopenedAt: day(6), everAcknowledged: true })).toEqual({ pending: true, reason: 'reopened' });
    expect(acknowledgementState({ latest: { acknowledgedAt: day(7) }, reopenedAt: day(6), everAcknowledged: true })).toEqual({ pending: false, reason: null });
  });

  it('does not ask a person who acknowledged and whose title was never reopened', () => {
    expect(acknowledgementState({ latest: { acknowledgedAt: day(5) }, reopenedAt: null, everAcknowledged: true })).toEqual({ pending: false, reason: null });
  });
});
