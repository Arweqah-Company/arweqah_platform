import { cellToText, normalizeHeader } from './cells';
import { parseCsv } from './csv';
import { MAX_IMPORT_BYTES, MAX_IMPORT_ROWS, type ImportColumn, type SheetRow } from './types';

export type ReadFailure = 'tooLarge' | 'tooManyRows' | 'unreadable' | 'empty' | 'missingColumns';

export class ImportFileError extends Error {
  constructor(
    readonly reason: ReadFailure,
    readonly detail?: string,
  ) {
    super(reason);
  }
}

async function readCells(file: File): Promise<unknown[][]> {
  if (/\.csv$/i.test(file.name)) return parseCsv(await file.text());
  const { readSheet } = await import('read-excel-file/universal');
  return (await readSheet(file)) as unknown[][];
}

/** Rows of an uploaded .xlsx or .csv keyed by column id. Headers match by label or id, ignoring the required star. */
export async function readImportFile(file: File, columns: ImportColumn[]): Promise<SheetRow[]> {
  if (file.size > MAX_IMPORT_BYTES) throw new ImportFileError('tooLarge');
  let table: unknown[][];
  try {
    table = await readCells(file);
  } catch {
    throw new ImportFileError('unreadable');
  }
  const [headerRow, ...body] = table;
  if (!headerRow || body.length === 0) throw new ImportFileError('empty');
  if (body.length > MAX_IMPORT_ROWS) throw new ImportFileError('tooManyRows', String(MAX_IMPORT_ROWS));
  const byHeader = new Map(columns.flatMap((c) => [[normalizeHeader(c.header), c.id] as const, [c.id.toLowerCase(), c.id] as const]));
  const positions = headerRow.map((h) => byHeader.get(normalizeHeader(cellToText(h))) ?? null);
  const missing = columns.filter((c) => c.required && !positions.includes(c.id)).map((c) => c.header);
  if (missing.length) throw new ImportFileError('missingColumns', missing.join(', '));
  return body
    .map((cells, i): SheetRow => ({ rowNumber: i + 2, cells: Object.fromEntries(positions.flatMap((id, col) => (id ? [[id, cellToText(cells[col])] as const] : []))) }))
    .filter((row) => Object.values(row.cells).some((v) => v !== ''));
}
