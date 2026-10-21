import type { DataValidationSheetOptions } from '@onparallel/write-excel-file-data-validation';
import type { Sheet } from 'write-excel-file/universal';
import { columnLetter, templateHeader } from './cells';
import type { ImportColumn } from './types';

const TEMPLATE_ROWS = 1000;

/**
 * The import template: a "Template" sheet with the headers (required ones starred) and a drop-down on every
 * column that has options, fed by a "Lists" sheet that holds every option one column each.
 */
export async function buildTemplateBlob(columns: ImportColumn[], sheets: { template: string; lists: string }): Promise<Blob> {
  const [{ default: writeXlsxFile }, { default: dataValidation }] = await Promise.all([import('write-excel-file/universal'), import('@onparallel/write-excel-file-data-validation')]);
  const withOptions = columns.map((c, index) => ({ c, index })).filter(({ c }) => c.options?.length);
  const listHeight = Math.max(1, ...withOptions.map(({ c }) => c.options?.length ?? 0));
  const lists = [
    withOptions.map(({ c }) => ({ value: c.header, fontWeight: 'bold' as const })),
    ...Array.from({ length: listHeight }, (_, row) => withOptions.map(({ c }) => c.options?.[row] ?? null)),
  ];
  const validations = withOptions.map(({ c, index }, listColumn) => ({
    cellRange: { from: { row: 2, column: index + 1 }, to: { row: TEMPLATE_ROWS + 1, column: index + 1 } },
    validation: { type: 'list' as const, valuesRange: `'${sheets.lists}'!$${columnLetter(listColumn)}$2:$${columnLetter(listColumn)}$${(c.options?.length ?? 0) + 1}` },
  }));
  const templateSheet: Sheet<Blob> & DataValidationSheetOptions = {
    sheet: sheets.template,
    data: [columns.map((c) => ({ value: templateHeader(c.header, c.required), fontWeight: 'bold' as const }))],
    columns: columns.map((c) => ({ width: Math.max(16, c.header.length + 6) })),
    dataValidation: validations,
  };
  return writeXlsxFile([templateSheet, { sheet: sheets.lists, data: withOptions.length ? lists : [['']] }], { features: [dataValidation] }).toBlob();
}
