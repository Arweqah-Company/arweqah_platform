import { EMPTY_CAREER_CONTENT, type CareerTitleContentDto } from '@arweqah-platform/shared';
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
