export type ExportFormat = 'xlsx' | 'csv';
export type CellValue = string | number | boolean | null | undefined;

/** One column a list can be exported with; `value` returns the text or number a person would read. */
export interface ExportColumn<T> {
  id: string;
  header: string;
  value: (row: T) => CellValue;
}

/** One column of an import template. `options` become a drop-down in the sheet (and a column of the Lists sheet). */
export interface ImportColumn {
  id: string;
  header: string;
  required?: boolean;
  options?: string[];
  /** Short help shown in the import dialog's column list. */
  hint?: string;
}

/** One data row of an uploaded file: its number in the sheet (header = 1) and its cells by column id. */
export interface SheetRow {
  rowNumber: number;
  cells: Record<string, string>;
}

/** A row after checking: either ready to run, or a list of what is wrong with it. */
export interface PreparedRow {
  rowNumber: number;
  errors: string[];
  run?: () => Promise<void>;
}

export const MAX_IMPORT_ROWS = 1000;
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export const MAX_EXPORT_ROWS = 10_000;
