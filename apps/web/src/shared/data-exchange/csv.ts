import { safeText } from './cells';
import type { CellValue } from './types';

/** UTF-8 byte-order mark: Excel needs it to read Arabic in a CSV. */
const BOM = String.fromCharCode(0xfeff);

const quote = (text: string): string => (/[",\r\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text);

export function toCsv(header: string[], rows: CellValue[][]): string {
  const lines = [header, ...rows].map((row) => row.map((cell) => quote(safeText(cell))).join(','));
  return `${BOM}${lines.join('\r\n')}\r\n`;
}

const unquote = (token: string): string => (token.startsWith('"') ? token.slice(1, -1).replace(/""/g, '"') : token);

/** Comma or semicolon, whichever the first line uses more (Excel in many locales writes semicolons). */
const delimiterOf = (firstLine: string): string => (firstLine.split(';').length > firstLine.split(',').length ? ';' : ',');

const TOKENS: Record<string, RegExp> = {
  ',': /("(?:[^"]|"")*"|[^,\r\n]*)(,|\r\n|\n|\r|$)/y,
  ';': /("(?:[^"]|"")*"|[^;\r\n]*)(;|\r\n|\n|\r|$)/y,
};

/** Parses CSV text: quoted cells, doubled quotes, line breaks inside quotes. Blank lines are kept so row numbers match the sheet. */
export function parseCsv(input: string): string[][] {
  const text = input.startsWith(BOM) ? input.slice(1) : input;
  const delimiter = delimiterOf(text.split(/\r?\n/, 1)[0] ?? '');
  const token = TOKENS[delimiter] as RegExp;
  token.lastIndex = 0;
  const rows: string[][] = [];
  let row: string[] = [];
  while (token.lastIndex < text.length) {
    const match = token.exec(text);
    if (!match) break;
    row.push(unquote(match[1] as string));
    if (match[2] !== delimiter) {
      rows.push(row);
      row = [];
    }
  }
  if (row.length) rows.push(row);
  return rows;
}
