import type { CatalogItemDto, CycleStage, EvalBlock, ReviewState, ReviewerLevel, SaveTeamEvaluationInput } from '@arweqah-platform/shared';

/**
 * Why a manager cannot write an evaluation now (plan §3.2): no cycle, the manager's stage has not begun, the upper manager before the direct
 * manager sent, or the stage is over. `null` when they can.
 */
export function evalBlock(stage: CycleStage | null, level: ReviewerLevel, directSent: boolean): EvalBlock | null {
  if (!stage) return 'no_cycle';
  if (stage === 'self') return 'not_started';
  if (stage !== 'mgr') return 'stage_over';
  return level === 'upper' && !directSent ? 'wait_direct' : null;
}

/** The direct manager writes at the direct level, and so does anyone in scope when the employee has no direct manager (there is nobody to wait for); anyone else in scope (the upper manager) writes at the upper one. */
export const reviewerLevel = (viewerUserId: string, directManagerUserId: string | null): ReviewerLevel => (!directManagerUserId || viewerUserId === directManagerUserId ? 'direct' : 'upper');

export const reviewState = (review: { sentAt: Date | null } | undefined): ReviewState => (!review ? 'none' : review.sentAt ? 'sent' : 'draft');

/** The sum of the points of the picked catalog items of a kind (ids that are not in the catalog count for nothing). */
export function pickedPoints(ids: readonly string[], kind: CatalogItemDto['kind'], catalog: readonly CatalogItemDto[]): number {
  return [...new Set(ids)].reduce((sum, id) => sum + (catalog.find((c) => c.id === id && c.kind === kind)?.points ?? 0), 0);
}

/** The form with the items that are not in the catalog taken out and each list without repeats (what a draft keeps). */
export function cleanTeam(input: SaveTeamEvaluationInput, catalog: readonly CatalogItemDto[]): SaveTeamEvaluationInput {
  const of = (ids: readonly string[], kind: CatalogItemDto['kind']) => [...new Set(ids)].filter((id) => catalog.some((c) => c.id === id && c.kind === kind));
  return { ...input, initIds: of(input.initIds, 'init'), growthIds: of(input.growthIds, 'growth') };
}
