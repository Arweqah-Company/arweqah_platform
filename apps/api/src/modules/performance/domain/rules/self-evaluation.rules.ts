import { levelNeedsNote, SELF_NOTE_MIN, type CatalogItemDto, type CycleStage, type SaveSelfEvaluationInput, type SelfProblem, type StageTemplate } from '@arweqah-platform/shared';

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
  const problems: SelfProblem[] = [];
  const known = new Set(template.behaviours.map((b) => b.code));
  for (const code of Object.keys(input.behaviours)) if (!known.has(code)) problems.push({ field: `behaviours.${code}`, code: 'unknown_behaviour' });
  for (const b of template.behaviours) {
    const given = input.behaviours[b.code];
    if (given?.level === undefined) problems.push({ field: `behaviours.${b.code}`, code: 'level_missing' });
    else if (levelNeedsNote(given.level) && given.note.trim().length < SELF_NOTE_MIN) problems.push({ field: `behaviours.${b.code}`, code: 'note_short' });
  }
  problems.push(...pickProblems('initIds', input.initIds, 'init', catalog), ...pickProblems('growthIds', input.growthIds, 'growth', catalog));
  return problems;
}

function pickProblems(field: string, ids: readonly string[], kind: CatalogItemDto['kind'], catalog: readonly CatalogItemDto[]): SelfProblem[] {
  const byId = new Map(catalog.map((c) => [c.id, c]));
  return ids.flatMap((id): SelfProblem[] => {
    const item = byId.get(id);
    if (!item) return [{ field, code: 'unknown_item' }];
    return item.kind === kind ? [] : [{ field, code: 'wrong_kind' }];
  });
}

/** The form with the items that are not in the catalog taken out and each list without repeats (what a draft keeps). */
export function cleanSelf(input: SaveSelfEvaluationInput, catalog: readonly CatalogItemDto[]): SaveSelfEvaluationInput {
  const of = (ids: readonly string[], kind: CatalogItemDto['kind']) => [...new Set(ids)].filter((id) => catalog.some((c) => c.id === id && c.kind === kind));
  return { ...input, initIds: of(input.initIds, 'init'), growthIds: of(input.growthIds, 'growth') };
}
