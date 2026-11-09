import { buildBands, deriveStageTemplate, fiscalEditProblems, scaleEditProblems, stageProblems, type EvalFileContent, type EvalFileResult, type EvalProblem } from '@arweqah-platform/shared';

/** What a parsed or analysed file stands for as forms: the stages without the computed totals, the scale's numbers and the card. */
export function contentOfResult(r: Omit<EvalFileResult, 'saved'>): EvalFileContent {
  return {
    stages: r.stages.map(({ template: t }) => ({ stage: t.stage, name: t.name, resultsWeight: t.resultsWeight, behaviourWeight: t.behaviourWeight, extra: t.extra, ruleText: t.ruleText, resultsNote: t.resultsNote, criteria: t.criteria, behaviours: t.behaviours })),
    scale: r.scale ? { bands: r.scale.bands.map((b) => ({ name: b.name, from: b.from, to: b.to, description: b.description })) } : null,
    fiscal: r.fiscal ? { months: r.fiscal.card.months as NonNullable<EvalFileContent['fiscal']>['months'], notes: r.fiscal.card.notes } : null,
  };
}

/** The result a content gives, with every part carrying the checks it fails (the same checks as a file's, and as the forms'). */
export function resultOfContent(content: EvalFileContent): Omit<EvalFileResult, 'saved'> {
  const numbers = content.stages.map((s) => s.stage);
  const stages = content.stages.map((s) => {
    const template = deriveStageTemplate(s.stage, s);
    const problems: EvalProblem[] = stageProblems(template);
    if (numbers.filter((n) => n === s.stage).length > 1) problems.push('duplicate_stage');
    return { stage: s.stage, name: s.name, problems, template };
  });
  const scale = content.scale ? { bands: buildBands(content.scale), problems: scaleEditProblems(content.scale.bands) } : null;
  const fiscal = content.fiscal ? { card: { months: content.fiscal.months, notes: content.fiscal.notes }, problems: fiscalEditProblems(content.fiscal.months) } : null;
  return { stages, scale, fiscal, ignored: [], content };
}
