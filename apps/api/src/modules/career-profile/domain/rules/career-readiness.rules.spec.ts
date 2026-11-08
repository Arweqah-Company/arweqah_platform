import { EMPTY_CAREER_CONTENT, type CareerContent } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { careerReadinessProblems } from './career-readiness.rules';

const complete: CareerContent = {
  ...EMPTY_CAREER_CONTENT,
  summary: 'ملخص',
  kpis: [{ text: 'مؤشر', governing: true }],
  responsibilities: [{ title: 'مسؤولية', tasks: ['مهمة'] }],
  ladder: [{ level: 'L9', title: 'منسق', current: true }],
  transitionRule: 'إتقان الحالات القياسية',
  steps: [{ n: 1, label: 'الأساس', title: 'دورة', meta: 'دورة · جهة' }],
  competencyColumns: ['L9'],
  competencies: [{ name: 'الاتصال', values: ['أساسي'] }],
  required: [{ when: '15 أكتوبر 2026', lines: ['أتأكد من مسماي'], deadline: '2026-10-15' }],
  ackText: 'اطلعت على الوصف الوظيفي',
};

describe('career readiness rules (FR-113)', () => {
  it('lists every incomplete section of an empty document', () => {
    expect(careerReadinessProblems(EMPTY_CAREER_CONTENT)).toEqual(['description', 'development', 'required']);
  });

  it('accepts a complete document', () => {
    expect(careerReadinessProblems(complete)).toEqual([]);
  });

  it.each([
    ['a missing summary', { summary: '' }, 'description'],
    ['no indicators', { kpis: [] }, 'description'],
    ['no responsibilities', { responsibilities: [] }, 'description'],
    ['a ladder without the current title', { ladder: [{ level: 'L9' as const, title: 'منسق', current: false }] }, 'development'],
    ['no level path', { steps: [] }, 'development'],
    ['no transition rule', { transitionRule: '' }, 'development'],
    ['no competencies', { competencies: [] }, 'development'],
    ['no required items', { required: [] }, 'required'],
    ['no acknowledgement sentence', { ackText: '' }, 'required'],
  ])('reports %s', (_name, change, problem) => {
    expect(careerReadinessProblems({ ...complete, ...change })).toEqual([problem]);
  });
});
