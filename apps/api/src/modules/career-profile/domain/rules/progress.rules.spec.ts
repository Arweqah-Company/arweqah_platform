import { describe, expect, it } from 'vitest';
import { EMPTY_CAREER_CONTENT, type CareerContent } from '@arweqah-platform/shared';
import { badgeProgress, unitCount, validRequiredIndexes } from './progress.rules';

const unit = (title: string) => ({ priority: 'إلزامي' as const, title, provider: '', duration: 'ساعة', minutes: 60, language: 'عربي', link: '' });
const content: CareerContent = {
  ...EMPTY_CAREER_CONTENT,
  required: [{ when: 'أ 2026', lines: ['س'], deadline: null }, { when: 'ب 2026', lines: ['ص'], deadline: null }],
  learning: { rule: '', badges: [{ name: 'التخصص', condition: 'x', hours: 40 }, { name: 'التأسيس', condition: 'y', hours: 20 }], periods: [{ name: 'س1', units: [unit('أ'), unit('ب')] }, { name: 'س2', units: [unit('ج')] }] },
};

describe('progress rules (FR-114)', () => {
  it('orders the medals by hours, marks the reached ones and names the next with the minutes missing', () => {
    const r = badgeProgress(content, 25 * 60);
    expect(r.badges).toEqual([{ name: 'التأسيس', hours: 20, reached: true }, { name: 'التخصص', hours: 40, reached: false }]);
    expect(r.nextBadge).toEqual({ name: 'التخصص', hours: 40, missingMinutes: 15 * 60 });
    expect(badgeProgress(content, 40 * 60).nextBadge).toBeNull();
    expect(badgeProgress(content, 0).badges.every((b) => !b.reached)).toBe(true);
  });

  it('counts the units of the plan and keeps only the ticks that match an item of the content', () => {
    expect(unitCount(content)).toBe(3);
    expect(validRequiredIndexes(content, [1, 0, 5, -1])).toEqual([0, 1]);
  });
});
