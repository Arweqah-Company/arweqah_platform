import i18n, { type TFunction } from 'i18next';
import type { ZodError } from 'zod';

export interface Choice {
  id: string;
  /** Every spelling that selects it (Arabic name, English name, code). The first one is shown in the template's drop-down. */
  labels: string[];
}

const norm = (text: string): string => text.trim().toLowerCase();

/** Finds the choice a cell names, by any of its labels; undefined when nothing matches. */
export const resolveChoice = (choices: Choice[], text: string): string | undefined => choices.find((c) => c.labels.some((l) => norm(l) === norm(text)))?.id;

export const dropdownOf = (choices: Choice[]): string[] => choices.map((c) => c.labels[0] as string);

/** Accepted yes / no spellings of both languages, read from the translation files so no word is hard-coded here. */
function words(key: 'yesWords' | 'noWords'): string[] {
  return (['ar', 'en'] as const).flatMap((lng) => i18n.getFixedT(lng)(`dataExchange.${key}`).split(',').map(norm));
}

/** true / false for yes-no spellings, null for an empty cell, undefined for anything else. */
export function parseYesNo(text: string): boolean | null | undefined {
  if (text.trim() === '') return null;
  if (words('yesWords').includes(norm(text))) return true;
  return words('noWords').includes(norm(text)) ? false : undefined;
}

export const isIsoDate = (text: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(text) && !Number.isNaN(Date.parse(text));

export function parseNumber(text: string): number | undefined {
  const value = Number(text.replace(/,/g, ''));
  return text.trim() !== '' && Number.isFinite(value) ? value : undefined;
}

/** One sentence per problem zod found in a row, naming the column the person sees (a wrong format gets a translated message). */
export function zodMessages(error: ZodError, headers: Record<string, string>, t: TFunction): string[] {
  return error.issues.map((issue) => {
    const column = headers[String(issue.path[0])] ?? String(issue.path[0] ?? '');
    return issue.code === 'invalid_format' ? t('dataExchange.cell.badFormat', { column }) : `${column}: ${issue.message}`;
  });
}

/** Collects the problems of one row; `cell` helpers add a translated message and return what they parsed. */
export class RowChecker {
  readonly errors: string[] = [];

  constructor(
    private readonly t: TFunction,
    private readonly cells: Record<string, string>,
    private readonly headers: Record<string, string>,
  ) {}

  text(id: string, required = false): string | null {
    const value = this.cells[id] ?? '';
    if (value === '' && required) this.errors.push(this.t('dataExchange.cell.required', { column: this.headers[id] }));
    return value === '' ? null : value;
  }

  choice(id: string, choices: Choice[], required = false): string | null {
    const value = this.text(id, required);
    if (value === null) return null;
    const found = resolveChoice(choices, value);
    if (!found) this.errors.push(this.t('dataExchange.cell.unknownOption', { column: this.headers[id], value }));
    return found ?? null;
  }

  date(id: string, required = false): string | null {
    const value = this.text(id, required);
    if (value !== null && !isIsoDate(value)) this.errors.push(this.t('dataExchange.cell.badDate', { column: this.headers[id] }));
    return value !== null && isIsoDate(value) ? value : null;
  }

  yesNo(id: string): boolean | null {
    const parsed = parseYesNo(this.cells[id] ?? '');
    if (parsed === undefined) this.errors.push(this.t('dataExchange.cell.badYesNo', { column: this.headers[id] }));
    return parsed ?? null;
  }

  number(id: string): number | null {
    const value = this.text(id);
    if (value === null) return null;
    const parsed = parseNumber(value);
    if (parsed === undefined) this.errors.push(this.t('dataExchange.cell.badNumber', { column: this.headers[id] }));
    return parsed ?? null;
  }
}

/** Reports a value that appears twice in the file, once per extra row. */
export function flagDuplicates(rows: { rowNumber: number; value: string | null }[], column: string, t: TFunction): Map<number, string> {
  const seen = new Set<string>();
  const result = new Map<number, string>();
  for (const { rowNumber, value } of rows) {
    if (value === null) continue;
    if (seen.has(value)) result.set(rowNumber, t('dataExchange.cell.duplicate', { column, value }));
    seen.add(value);
  }
  return result;
}
