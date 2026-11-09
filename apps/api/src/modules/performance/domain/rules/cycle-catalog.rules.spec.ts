import { describe, expect, it } from 'vitest';
import type { StageTemplate } from '@arweqah-platform/shared';
import { catalogCaps } from './cycle-catalog.rules';

const stage = (n: number, extra: { name: string; points: number }[]): StageTemplate => ({ stage: n, name: `s${n}`, resultsWeight: 60, behaviourWeight: 40, basicTotal: 100, extra, cap: 125, ruleText: '', resultsNote: '', criteria: [], behaviours: [] });

describe('catalogCaps (FR-118)', () => {
  it('reads the caps of initiatives and growth from the first stage that is kept', () => {
    const stages = [stage(2, [{ name: 'تعلم', points: 8 }, { name: 'مبادرات', points: 7 }, { name: 'نمو', points: 6 }]), stage(1, [{ name: 'تعلم', points: 10 }, { name: 'مبادرات', points: 10 }, { name: 'نمو', points: 5 }])];
    expect(catalogCaps(stages)).toEqual({ init: 10, growth: 5 });
  });

  it('gives the defaults (10 and 5) when no stage is kept or it has no such components', () => {
    expect(catalogCaps([])).toEqual({ init: 10, growth: 5 });
    expect(catalogCaps([stage(1, [{ name: 'تعلم', points: 10 }])])).toEqual({ init: 10, growth: 5 });
  });
});
