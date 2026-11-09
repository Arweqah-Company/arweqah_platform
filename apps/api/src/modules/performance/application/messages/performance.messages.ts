/** Audit action names of the performance module (their wording for people is in the shared audit catalog). */
export const PERFORMANCE_AUDIT = {
  templateSaved: 'performance.template.saved',
  cycleOpened: 'performance.cycle.opened',
  cycleAdvanced: 'performance.cycle.advanced',
  cycleClosed: 'performance.cycle.closed',
  cycleDateSet: 'performance.cycle.date_set',
  catalogAdded: 'performance.catalog.added',
  catalogRemoved: 'performance.catalog.removed',
  selfSent: 'performance.self.sent',
  selfEdited: 'performance.self.edited',
} as const;

export const PERFORMANCE_TEMPLATE_ENTITY = 'performance_template';
export const PERFORMANCE_CYCLE_ENTITY = 'performance_cycle';
export const PERFORMANCE_CATALOG_ENTITY = 'performance_catalog_item';
export const PERFORMANCE_EVALUATION_ENTITY = 'performance_evaluation';
