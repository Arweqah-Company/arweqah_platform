import { describe, expect, it } from 'vitest';
import { EMPTY_CAREER_CONTENT, type CareerContent } from '@arweqah-platform/shared';
import { competencyStatuses, requiredLevel } from './competency.rules';

const content = (competencies: CareerContent['competencies']): CareerContent => ({ ...EMPTY_CAREER_CONTENT, competencies });

describe('requiredLevel', () => {
  it('reads the first column, only when it is a level', () => {
    expect(requiredLevel(['أساسي', 'خبير'])).toBe('أساسي');
    expect(requiredLevel(['خبير'])).toBe('خبير');
    expect(requiredLevel(['غير مطلوبة', 'أساسي'])).toBeNull();
    expect(requiredLevel(['—'])).toBeNull();
    expect(requiredLevel([])).toBeNull();
  });
});

describe('competencyStatuses (FR-117)', () => {
  const c = content([
    { name: 'تحليل الأعمال', values: ['أساسي', 'خبير'] },
    { name: 'التواصل', values: ['خبير', 'خبير'] },
    { name: 'تقنية البيانات', values: ['غير مطلوبة', 'أساسي'] },
  ]);

  it('lists only the competencies the title asks for at the employee\'s level, unmet when nothing is recorded', () => {
    expect(competencyStatuses(c, new Map())).toEqual([
      { name: 'تحليل الأعمال', required: 'أساسي', mine: null, met: false },
      { name: 'التواصل', required: 'خبير', mine: null, met: false },
    ]);
  });

  it('counts a competency met from the required level up, never below it', () => {
    const rows = competencyStatuses(c, new Map([['تحليل الأعمال', 'خبير'], ['التواصل', 'أساسي']]));
    expect(rows.map((r) => [r.name, r.mine, r.met])).toEqual([['تحليل الأعمال', 'خبير', true], ['التواصل', 'أساسي', false]]);
  });

  it('ignores a recorded value that is not a level', () => {
    expect(competencyStatuses(c, new Map([['تحليل الأعمال', 'xyz']]))[0]).toMatchObject({ mine: null, met: false });
  });
});
