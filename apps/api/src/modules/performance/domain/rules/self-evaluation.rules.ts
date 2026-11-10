import { formProblems, type CatalogItemDto, type CycleStage, type SaveSelfEvaluationInput, type SelfProblem, type StageTemplate } from '@arweqah-platform/shared';

/** The empty form of a stage: nothing rated, nothing written. */
export const emptySelf = (): SaveSelfEvaluationInput => ({ behaviours: {}, achievements: {}, initIds: [], growthIds: [] });

/**
 * Whether the self-evaluation can be written or changed: in its own stage, and in the manager's stage until the manager starts (the manager's
 * start comes with the manager's evaluation; until then nobody has started).
 */
export function selfEditable(stage: CycleStage, managerStarted: boolean): boolean {
  return stage === 'self' || (stage === 'mgr' && !managerStarted);
}

/** What a form needs to be sent: every behaviour of the stage rated, a note where the level asks for one, and only items of the catalog of the right kind. */
export function selfProblems(template: StageTemplate, input: SaveSelfEvaluationInput, catalog: readonly CatalogItemDto[]): SelfProblem[] {
  return formProblems(template, input, catalog);
}

/** The form with the items that are not in the catalog taken out and each list without repeats (what a draft keeps). */
export function cleanSelf(input: SaveSelfEvaluationInput, catalog: readonly CatalogItemDto[]): SaveSelfEvaluationInput {
  const of = (ids: readonly string[], kind: CatalogItemDto['kind']) => [...new Set(ids)].filter((id) => catalog.some((c) => c.id === id && c.kind === kind));
  return { ...input, initIds: of(input.initIds, 'init'), growthIds: of(input.growthIds, 'growth') };
}
