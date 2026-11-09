import { describe, expect, it } from 'vitest';
import { EMPTY_CAREER_CONTENT, type CareerContent } from '@arweqah-platform/shared';
import { teamNumbers } from './team.rules';

const U1 = '3f0f6a52-0a14-4a53-9a43-5a6d4c2f9b11';
const U2 = '3f0f6a52-0a14-4a53-9a43-5a6d4c2f9b12';
const U3 = '3f0f6a52-0a14-4a53-9a43-5a6d4c2f9b13';
const unit = (id: string, priority: 'إلزامي' | 'ضروري' | 'أساسي') => ({ id, priority, title: id, provider: '', duration: 'ساعة', minutes: 60, language: 'عربي', link: '' });
const content: CareerContent = {
  ...EMPTY_CAREER_CONTENT,
  required: [{ when: 'أ', lines: [], deadline: '2026-10-31' }, { when: 'ب', lines: [], deadline: '2026-12-31' }, { when: 'ج', lines: [], deadline: null }],
  learning: { rule: '', badges: [], periods: [{ name: 'س', units: [unit(U1, 'إلزامي'), unit(U2, 'ضروري'), unit(U3, 'أساسي')] }] },
};

describe('team numbers (FR-115)', () => {
  it('counts only the mandatory and necessary units, the approved minutes and the waiting proofs', () => {
    const n = teamNumbers({ content, today: '2026-11-08', ticked: [0], records: [{ unitId: U1, status: 'done', minutes: 60 }, { unitId: U3, status: 'done', minutes: 30 }, { unitId: U2, status: 'wait', minutes: 60 }] });
    expect(n).toMatchObject({ requiredTotal: 2, requiredDone: 1, approvedMinutes: 90, waiting: 1, overdue: 0, status: 'regular' });
  });

  it('is late when a dated item is past its date and not ticked; a ticked or undated or future item is not', () => {
    expect(teamNumbers({ content, today: '2026-11-08', ticked: [], records: [] })).toMatchObject({ overdue: 1, status: 'late' });
    expect(teamNumbers({ content, today: '2026-11-08', ticked: [0], records: [] })).toMatchObject({ overdue: 0, status: 'regular' });
    expect(teamNumbers({ content, today: '2027-01-01', ticked: [0], records: [] })).toMatchObject({ overdue: 1, status: 'late' });
  });
});
