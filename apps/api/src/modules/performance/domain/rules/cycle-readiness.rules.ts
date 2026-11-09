import { PERFORMANCE_STAGES, type FiscalCard, type GradeBand, type ReadinessDto, type StageTemplate } from '@arweqah-platform/shared';

/** What must be there to open a cycle: a sound template for each of the five stages, the grade scale and the fiscal-year card. The catalog may be empty. */
export function cycleReadiness(stages: readonly StageTemplate[], scale: readonly GradeBand[] | null, fiscal: FiscalCard | null, catalogItems: number): ReadinessDto {
  const have = new Set(stages.map((s) => s.stage));
  const rows = PERFORMANCE_STAGES.map((stage) => ({ stage, ready: have.has(stage) }));
  const hasScale = !!scale?.length;
  const hasFiscal = !!fiscal?.months.length;
  return { stages: rows, scale: hasScale, fiscal: hasFiscal, catalogItems, ready: rows.every((r) => r.ready) && hasScale && hasFiscal };
}
