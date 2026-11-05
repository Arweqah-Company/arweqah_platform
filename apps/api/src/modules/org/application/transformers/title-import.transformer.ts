import type { TitleImportResultDto } from '@arweqah-platform/shared';
import type { RowPlan } from '../../domain/rules/title-import.rules';

const STATUS = { create: 'created', update: 'updated', unchanged: 'unchanged', rejected: 'rejected' } as const;

/** The report of a titles file: a line per row and the totals. */
export function summarizeImport(plans: readonly RowPlan[], dryRun: boolean): TitleImportResultDto {
  const rows = plans.map((p) => ({ row: p.row, status: STATUS[p.status], code: p.code, reasons: [...p.reasons] }));
  const count = (status: (typeof STATUS)[keyof typeof STATUS]): number => rows.filter((r) => r.status === status).length;
  return { dryRun, created: count('created'), updated: count('updated'), unchanged: count('unchanged'), rejected: count('rejected'), rows };
}
