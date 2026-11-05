import { describe, expect, it } from 'vitest';
import { OrgVersionDateNotAfterError, OrgVersionInThePastError } from '../errors/org.errors';
import { planVersion, versionInForce, versionStatus } from './org-version.rules';

const TODAY = '2026-11-05';
const v = (id: string, validFrom: string, validTo: string | null) => ({ id, validFrom, validTo, appliedAt: new Date() });

describe('dated versions of a unit: what a new version does to the history (FR-99)', () => {
  it('closes the open version the day before and applies a change that starts today at once', () => {
    expect(planVersion([v('a', '2024-01-01', null)], TODAY, TODAY)).toEqual({ closeId: 'a', closeTo: '2026-11-04', replaceId: null, applyNow: true });
  });

  it('schedules a future change: the open version is closed the day before it, nothing is applied now', () => {
    expect(planVersion([v('a', '2024-01-01', null)], '2027-01-01', TODAY)).toEqual({ closeId: 'a', closeTo: '2026-12-31', replaceId: null, applyNow: false });
  });

  it('corrects the last version on the day it starts instead of adding an empty one (today or scheduled)', () => {
    expect(planVersion([v('a', '2024-01-01', '2026-11-04'), v('b', TODAY, null)], TODAY, TODAY)).toMatchObject({ replaceId: 'b', closeId: null, applyNow: true });
    expect(planVersion([v('a', '2024-01-01', '2026-12-31'), v('b', '2027-01-01', null)], '2027-01-01', TODAY)).toMatchObject({ replaceId: 'b', applyNow: false });
  });

  it('never rewrites a past version: yesterday is refused, and so is a day before the last version starts', () => {
    expect(() => planVersion([v('a', '2024-01-01', null)], '2026-11-04', TODAY)).toThrow(OrgVersionInThePastError);
    expect(() => planVersion([v('a', '2024-01-01', '2026-12-31'), v('b', '2027-01-01', null)], '2026-12-01', TODAY)).toThrow(OrgVersionDateNotAfterError);
  });

  it('starts a unit with no version at all from the given day', () => {
    expect(planVersion([], TODAY, TODAY)).toEqual({ closeId: null, closeTo: null, replaceId: null, applyNow: true });
  });
});

describe('the status of a version and the one in force', () => {
  const list = [v('past', '2024-01-01', '2025-12-31'), v('now', '2026-01-01', '2026-12-31'), v('next', '2027-01-01', null)];

  it('tells past, current and scheduled apart', () => {
    expect(list.map((x) => versionStatus(x, TODAY))).toEqual(['past', 'current', 'scheduled']);
  });

  it('shows the newest version that has started', () => {
    expect(versionInForce(list, TODAY)?.id).toBe('now');
    expect(versionInForce([v('later', '2027-01-01', null)], TODAY)).toBeNull();
  });
});
