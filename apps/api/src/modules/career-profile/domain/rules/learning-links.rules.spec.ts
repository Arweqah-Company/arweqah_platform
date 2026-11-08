import { EMPTY_CAREER_CONTENT, type CareerContent } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { planLearningLinks, type CodedContent } from './learning-links.rules';

const unit = (title: string, link = '') => ({ id: `id-${title}`, priority: 'إلزامي' as const, title, provider: '', duration: 'ساعتان', minutes: 120, language: 'عربي', link });
const content: CareerContent = {
  ...EMPTY_CAREER_CONTENT,
  learning: { badges: [], rule: '', periods: [{ name: 'السنة 1', units: [unit('أ', 'https://old.example/a'), unit('ب'), unit('مكرر'), unit('مكرر')] }, { name: 'السنة 2', units: [unit('أ')] }] },
};
const byCode = new Map<string, CodedContent>([['OPS-1', { titleId: 't1', version: 4, content }], ['OPS-2', { titleId: 't2', version: 0, content: null }]]);
const row = (over: Partial<Parameters<typeof planLearningLinks>[0][number]>) => ({ titleCode: 'OPS-1', period: 'السنة 1', unit: 'ب', link: 'https://new.example/b', ...over });

describe('learning links rules (FR-113)', () => {
  it('sets a link, clears one, and leaves one that is already the same as it is', () => {
    const plan = planLearningLinks([row({}), row({ unit: 'أ', link: '' }), row({ period: 'السنة 2', unit: 'أ', link: '' })], byCode);
    expect(plan.rows.map((r) => r.status)).toEqual(['updated', 'updated', 'unchanged']);
    expect(plan.changes).toHaveLength(1);
    const units = plan.changes[0]!.content.learning.periods[0]!.units;
    expect(units.map((u) => u.link)).toEqual(['', 'https://new.example/b', '', '']);
    expect(plan.changes[0]).toMatchObject({ titleId: 't1', version: 4, rows: [1, 2] });
    expect(content.learning.periods[0]!.units[0]!.link).toBe('https://old.example/a'); // the original is never changed
  });

  it('finds a title by its code in either case', () => {
    expect(planLearningLinks([row({ titleCode: 'ops-1' })], byCode).rows[0]).toMatchObject({ status: 'updated' });
  });

  it.each([
    ['an unknown title', { titleCode: 'XX-9' }, 'title_not_found'],
    ['a title with no content', { titleCode: 'OPS-2' }, 'no_content'],
    ['an unknown period', { period: 'السنة 9' }, 'period_not_found'],
    ['an unknown unit', { unit: 'غير موجودة' }, 'unit_not_found'],
    ['two units of the same name', { unit: 'مكرر' }, 'unit_ambiguous'],
  ])('refuses %s', (_name, over, reason) => {
    expect(planLearningLinks([row(over)], byCode).rows[0]).toEqual({ row: 1, status: 'rejected', reason });
  });

  it('refuses a second row for the same unit and changes nothing for a refused row', () => {
    const plan = planLearningLinks([row({}), row({ link: 'https://other.example' })], byCode);
    expect(plan.rows.map((r) => r.reason)).toEqual([null, 'duplicate_row']);
    expect(plan.changes[0]!.content.learning.periods[0]!.units[1]!.link).toBe('https://new.example/b');
    expect(planLearningLinks([row({ titleCode: 'XX-9' })], byCode).changes).toEqual([]);
  });
});
