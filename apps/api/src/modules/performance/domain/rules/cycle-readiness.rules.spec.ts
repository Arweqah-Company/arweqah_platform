import { describe, expect, it } from 'vitest';
import type { FiscalCard, GradeBand, StageTemplate } from '@arweqah-platform/shared';
import { cycleReadiness } from './cycle-readiness.rules';

const stage = (n: number): StageTemplate => ({ stage: n, name: `s${n}`, resultsWeight: 60, behaviourWeight: 40, basicTotal: 100, extra: [], cap: 125, ruleText: '', resultsNote: '', criteria: [], behaviours: [] });
const BANDS: GradeBand[] = [{ name: 'a', range: '1', from: 1, to: null, description: '' }];
const CARD: FiscalCard = { months: [{ month: 'أبريل', kind: 'محطة' }], notes: [] };

describe('cycleReadiness (FR-118)', () => {
  it('is ready only with the five stages, the scale and the card', () => {
    const all = [1, 2, 3, 4, 5].map(stage);
    expect(cycleReadiness(all, BANDS, CARD, 0)).toMatchObject({ ready: true, scale: true, fiscal: true, catalogItems: 0 });
    expect(cycleReadiness(all.slice(0, 4), BANDS, CARD, 3)).toMatchObject({ ready: false, catalogItems: 3 });
    expect(cycleReadiness(all, null, CARD, 0).ready).toBe(false);
    expect(cycleReadiness(all, BANDS, null, 0).ready).toBe(false);
  });

  it('says which stage is missing', () => {
    expect(cycleReadiness([stage(1), stage(3)], BANDS, CARD, 0).stages).toEqual([{ stage: 1, ready: true }, { stage: 2, ready: false }, { stage: 3, ready: true }, { stage: 4, ready: false }, { stage: 5, ready: false }]);
  });
});
