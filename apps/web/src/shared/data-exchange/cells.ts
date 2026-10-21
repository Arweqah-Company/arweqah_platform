import type { CellValue } from './types';

/** A text that a spreadsheet would run as a formula is stored as plain text instead (CSV / formula injection). */
export function safeText(value: CellValue): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /^[=+\-@\t\r]/.test(text) && typeof value === 'string' ? `'${text}` : text;
}

/** Excel column letters: 0 → A, 25 → Z, 26 → AA. */
export function columnLetter(index: number): string {
  let n = index;
  let letters = '';
  do {
    letters = String.fromCharCode(65 + (n % 26)) + letters;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return letters;
}

/** The header of a template column: required ones end with a star. Matching ignores the star. */
export const templateHeader = (header: string, required?: boolean): string => (required ? `${header} *` : header);
export const normalizeHeader = (header: string): string => header.replace(/\s*\*\s*$/, '').trim().toLowerCase();

/** Date cells arrive as Date objects: their UTC calendar day as an ISO date. */
export function cellToText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}
