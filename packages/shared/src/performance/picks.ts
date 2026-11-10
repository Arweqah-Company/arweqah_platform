import type { CatalogItemDto } from './cycle';
import { levelNeedsNote, SELF_NOTE_MIN } from './self-evaluation';
import type { StageTemplate } from './template';

/** A catalog pick that cannot be kept: the field it came in and why. */
export interface PickProblem {
  field: string;
  code: 'unknown_item' | 'wrong_kind';
}

/** The picks of a form that are not in the catalog, or are of the other kind (shared by the employee's and the manager's forms). */
export function pickProblems(field: string, ids: readonly string[], kind: CatalogItemDto['kind'], catalog: readonly CatalogItemDto[]): PickProblem[] {
  const byId = new Map(catalog.map((c) => [c.id, c]));
  return ids.flatMap((id): PickProblem[] => {
    const item = byId.get(id);
    if (!item) return [{ field, code: 'unknown_item' }];
    return item.kind === kind ? [] : [{ field, code: 'wrong_kind' }];
  });
}

/** What is wrong with the behaviours and the picks of a form: each field with the check it failed (shared by the employee's and the manager's forms). */
export interface FormProblem {
  field: string;
  code: 'unknown_behaviour' | 'level_missing' | 'note_short' | PickProblem['code'];
}

export function formProblems(template: StageTemplate, form: { behaviours: Record<string, { level?: number; note: string }>; initIds: readonly string[]; growthIds: readonly string[] }, catalog: readonly CatalogItemDto[]): FormProblem[] {
  const problems: FormProblem[] = [];
  const known = new Set(template.behaviours.map((b) => b.code));
  for (const code of Object.keys(form.behaviours)) if (!known.has(code)) problems.push({ field: `behaviours.${code}`, code: 'unknown_behaviour' });
  for (const b of template.behaviours) {
    const given = form.behaviours[b.code];
    if (given?.level === undefined) problems.push({ field: `behaviours.${b.code}`, code: 'level_missing' });
    else if (levelNeedsNote(given.level) && given.note.trim().length < SELF_NOTE_MIN) problems.push({ field: `behaviours.${b.code}`, code: 'note_short' });
  }
  return [...problems, ...pickProblems('initIds', form.initIds, 'init', catalog), ...pickProblems('growthIds', form.growthIds, 'growth', catalog)];
}
