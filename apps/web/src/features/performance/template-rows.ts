import { PERFORMANCE_STAGES, type StageTemplate, type TemplatesDto } from '@arweqah-platform/shared';

export type TemplateKind = 'stage' | 'scale' | 'fiscal';

/** One row of the evaluation-file list: a stage, the grade scale or the fiscal card, and whether it is kept. */
export interface TemplateRow {
  id: string;
  kind: TemplateKind;
  stage: number | null;
  have: boolean;
  template: StageTemplate | null;
}

/** The seven rows, always: the five stages (kept or not), the scale and the card. */
export function templateRows(templates: TemplatesDto): TemplateRow[] {
  const stages = PERFORMANCE_STAGES.map((stage): TemplateRow => { const template = templates.stages.find((s) => s.stage === stage) ?? null; return { id: `stage-${stage}`, kind: 'stage', stage, have: !!template, template }; });
  return [...stages, { id: 'scale', kind: 'scale', stage: null, have: !!templates.scale?.length, template: null }, { id: 'fiscal', kind: 'fiscal', stage: null, have: !!templates.fiscal?.months.length, template: null }];
}
