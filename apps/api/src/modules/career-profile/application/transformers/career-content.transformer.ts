import { randomUUID } from 'node:crypto';
import { EMPTY_CAREER_CONTENT, type CareerContent, type CareerTitleContentDto } from '@arweqah-platform/shared';
import { careerReadinessProblems } from '../../domain/rules/career-readiness.rules';
import type { StoredCareerContent, TitleIdentity } from '../../domain/types/career-profile.types';

/** The stored content (or nothing yet) of a title as the API returns it. */
export function toCareerContentDto(title: TitleIdentity, stored: StoredCareerContent | null): CareerTitleContentDto {
  const content = stored?.content ?? EMPTY_CAREER_CONTENT;
  return {
    titleId: title.id,
    titleCode: title.code,
    titleNameAr: title.nameAr,
    titleNameEn: title.nameEn,
    version: stored?.version ?? 0,
    status: stored?.status ?? 'draft',
    content,
    problems: careerReadinessProblems(content),
    updatedAt: stored ? stored.updatedAt.toISOString() : null,
  };
}

/** Gives every learning unit that has no id its own (a unit keeps its id for good: the employee's progress will point at it). */
export function withUnitIds(content: CareerContent, newId: () => string = randomUUID): CareerContent {
  const periods = content.learning.periods.map((p) => ({ ...p, units: p.units.map((u) => ({ ...u, id: u.id ?? newId() })) }));
  return { ...content, learning: { ...content.learning, periods } };
}
