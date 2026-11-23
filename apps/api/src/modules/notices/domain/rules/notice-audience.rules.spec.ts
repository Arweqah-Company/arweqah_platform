import { describe, expect, it } from 'vitest';
import { audienceSets, normalizeAudience, referencedIds } from './notice-audience.rules';

const U1 = '00000000-0000-4000-8000-000000000001';
const U2 = '00000000-0000-4000-8000-000000000002';
const T1 = '00000000-0000-4000-8000-000000000003';
const G1 = '00000000-0000-4000-8000-000000000004';

describe('Audience rules (FR-168)', () => {
  it('splits the rules by kind and counts a repeated rule once', () => {
    const sets = audienceSets([
      { type: 'unit', refId: U1, includeBelow: true },
      { type: 'unit', refId: U1, includeBelow: true },
      { type: 'unit', refId: U2, includeBelow: false },
      { type: 'title', refId: T1 },
      { type: 'people_group', refId: G1 },
    ]);
    expect(sets).toEqual({ all: false, unitsWithBelow: [U1], unitsExact: [U2], titles: [T1], groups: [G1] });
  });

  it('lets `all` stand alone and ignores a rule without an id', () => {
    expect(audienceSets([{ type: 'all' }, { type: 'unit', refId: U1, includeBelow: true }]).all).toBe(true);
    expect(normalizeAudience([{ type: 'unit', refId: U1, includeBelow: true }, { type: 'all' }])).toEqual([{ type: 'all', refId: null, includeBelow: false }]);
    expect(audienceSets([{ type: 'unit', refId: null }]).unitsWithBelow).toEqual([]);
  });

  it('stores each rule once, `includeBelow` only for units', () => {
    expect(normalizeAudience([{ type: 'title', refId: T1, includeBelow: true }, { type: 'title', refId: T1 }, { type: 'unit', refId: U1 }])).toEqual([
      { type: 'title', refId: T1, includeBelow: false },
      { type: 'unit', refId: U1, includeBelow: false },
    ]);
  });

  it('lists the ids a set of rules names, by kind', () => {
    expect(referencedIds([{ type: 'unit', refId: U1, includeBelow: true }, { type: 'unit', refId: U1, includeBelow: false }, { type: 'title', refId: T1 }, { type: 'all' }])).toEqual({ units: [U1], titles: [T1], groups: [] });
  });
});
