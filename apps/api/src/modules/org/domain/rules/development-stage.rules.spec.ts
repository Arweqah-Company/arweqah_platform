import { describe, expect, it } from 'vitest';
import { DEFAULT_STAGE_RULES, stageFor } from './development-stage.rules';

describe('development stage from grade and track', () => {
  it('reads the stage from both the grade and the track', () => {
    expect(stageFor(DEFAULT_STAGE_RULES, 7, 'P')?.code).toBe('specialization');
    expect(stageFor(DEFAULT_STAGE_RULES, 7, 'J')?.code).toBe('mastery');
    expect(stageFor(DEFAULT_STAGE_RULES, 7, 'M')?.code).toBe('operational_leadership');
    expect(stageFor(DEFAULT_STAGE_RULES, 6, 'P')?.code).toBe('mastery');
  });

  it('uses the grade alone where the track does not matter', () => {
    expect(stageFor(DEFAULT_STAGE_RULES, 9, 'P')?.code).toBe('foundation');
    expect(stageFor(DEFAULT_STAGE_RULES, 5, 'M')?.code).toBe('operational_leadership');
    expect(stageFor(DEFAULT_STAGE_RULES, 3, 'M')?.code).toBe('institutional_leadership');
  });

  it('gives the yearly hours and the budget cap of the stage', () => {
    expect(stageFor(DEFAULT_STAGE_RULES, 4, 'M')).toEqual({ code: 'institutional_leadership', hoursPerYear: 60, budgetCap: 18000 });
  });

  it('returns nothing when no rule covers the grade and track, instead of guessing', () => {
    expect(stageFor(DEFAULT_STAGE_RULES, 2, 'M')).toBeNull();
    expect(stageFor(DEFAULT_STAGE_RULES, 7, 'C')).toBeNull();
    expect(stageFor(DEFAULT_STAGE_RULES, 6, 'S')).toBeNull();
  });
});
