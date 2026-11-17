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
  /** A column with a written format (a date, a phone): the template tells the person the format when they select a cell of it. */
  format?: 'date' | 'phone';
  /** Short help shown in the import dialog's column list. */
  hint?: string;
}

/** An extra yes/no the person answers once, before the import starts (e.g. «send the invitation e-mails»); its answer reaches every row's `run`. */
export interface ImportOption {
  label: string;
  defaultOn?: boolean;
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
  /** Saves the row; `option` is the state of the dialog's extra checkbox (when the list has one). */
  run?: (option?: boolean) => Promise<void>;
}

export const MAX_IMPORT_ROWS = 1000;
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export const MAX_EXPORT_ROWS = 10_000;
