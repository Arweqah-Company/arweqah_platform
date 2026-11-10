import { levelNeedsNote, levelOf, scoreOf, SELF_NOTE_MIN, type BehaviourLevel, type GradeBand, type SaveTeamEvaluationInput, type ScoreParts, type TeamEvaluationDto } from '@arweqah-platform/shared';

/** The sum of the points of the picked items of a kind. */
const points = (dto: TeamEvaluationDto, ids: readonly string[], kind: 'init' | 'growth'): number => dto.catalog.filter((c) => c.kind === kind && ids.includes(c.id)).reduce((sum, c) => sum + c.points, 0);

/** The score of the form as it stands: the same formula the server uses, so the live card and the saved score agree. */
export function liveScore(dto: TeamEvaluationDto, form: SaveTeamEvaluationInput): { score: ScoreParts; band: GradeBand | null } {
  const score = scoreOf({
    template: dto.template,
    results: dto.template.criteria.map((_, i) => form.results[String(i)]),
    behaviours: Object.fromEntries(Object.entries(form.behaviours).map(([code, v]) => [code, v.level as BehaviourLevel | undefined])),
    learning: dto.learning,
    picks: { init: points(dto, form.initIds, 'init'), growth: points(dto, form.growthIds, 'growth') },
    caps: dto.catalogCaps,
  });
  return { score, band: levelOf(dto.scale, score.final) };
}

/** What is wrong with the form now, by field (what the server would refuse): a score outside 0..100 or missing, a behaviour not rated, a note too short. */
export function formErrors(dto: TeamEvaluationDto, form: SaveTeamEvaluationInput): Record<string, 'result_missing' | 'level_missing' | 'note_short'> {
  const errors: Record<string, 'result_missing' | 'level_missing' | 'note_short'> = {};
  dto.template.criteria.forEach((_, i) => { const v = form.results[String(i)]; if (v === undefined || !(v >= 0 && v <= 100)) errors[`results.${i}`] = 'result_missing'; });
  for (const b of dto.template.behaviours) {
    const v = form.behaviours[b.code];
    if (v?.level === undefined) errors[`behaviours.${b.code}`] = 'level_missing';
    else if (levelNeedsNote(v.level) && v.note.trim().length < SELF_NOTE_MIN) errors[`behaviours.${b.code}`] = 'note_short';
  }
  return errors;
}

/** The scores of a form with one criterion set (an empty value takes it away). */
export function withResult(results: SaveTeamEvaluationInput['results'], index: number, value: string): SaveTeamEvaluationInput['results'] {
  const rest = Object.fromEntries(Object.entries(results).filter(([key]) => key !== String(index)));
  return value === '' ? rest : { ...rest, [String(index)]: Number(value) };
}
