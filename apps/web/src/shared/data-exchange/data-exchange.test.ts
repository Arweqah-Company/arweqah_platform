import { describe, expect, it } from 'vitest';
import { columnLetter, safeText } from './cells';
import { parseCsv, toCsv } from './csv';
import { buildExportBlob } from './export-file';
import { ImportFileError, readImportFile } from './read-sheet';
import { buildTemplateBlob } from './template';
import type { ImportColumn } from './types';

const fileOf = (content: string | Blob, name: string) => new File([content], name);
const columns: ImportColumn[] = [
  { id: 'code', header: 'الرمز', required: true },
  { id: 'name', header: 'الاسم', required: true },
  { id: 'status', header: 'الحالة', options: ['نشط', 'معطّل'] },
];

describe('Data exchange: files (FR-28, FR-29)', () => {
  it('keeps a text that a spreadsheet would run as a formula as plain text', () => {
    expect(safeText('=SUM(A1:A2)')).toBe("'=SUM(A1:A2)");
    expect(safeText('+966501234567')).toBe("'+966501234567");
    expect(safeText('@cmd')).toBe("'@cmd");
    expect(safeText(-5)).toBe('-5');
    expect(safeText(null)).toBe('');
    expect(safeText('عادي')).toBe('عادي');
  });

  it('names Excel columns', () => {
    expect([0, 1, 25, 26, 27, 701, 702].map(columnLetter)).toEqual(['A', 'B', 'Z', 'AA', 'AB', 'ZZ', 'AAA']);
  });

  it('writes and reads CSV with quotes, commas, line breaks, Arabic and a byte-order mark', () => {
    const csv = toCsv(['اسم', 'ملاحظة'], [['أروقة، الريادة', 'سطر 1\nسطر "2"'], ['=cmd', '']]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(parseCsv(csv)).toEqual([['اسم', 'ملاحظة'], ['أروقة، الريادة', 'سطر 1\nسطر "2"'], ["'=cmd", '']]);
  });

  it('reads semicolon-separated CSV (Excel in many locales)', () => {
    expect(parseCsv('a;b\r\n1;2\r\n3;4\r\n')).toEqual([['a', 'b'], ['1', '2'], ['3', '4']]);
  });

  it('exports the chosen columns as CSV and as a readable Excel file', async () => {
    const rows = [{ n: 'أروقة', c: 3 }, { n: 'لدن', c: 0 }];
    const cols = [{ id: 'n', header: 'الاسم', value: (r: (typeof rows)[0]) => r.n }, { id: 'c', header: 'العدد', value: (r: (typeof rows)[0]) => r.c }];
    const csv = await (await buildExportBlob('csv', cols, rows)).text();
    expect(parseCsv(csv)).toEqual([['الاسم', 'العدد'], ['أروقة', '3'], ['لدن', '0']]);
    const { readSheet } = await import('read-excel-file/universal');
    expect(await readSheet(await buildExportBlob('xlsx', cols, rows))).toEqual([['الاسم', 'العدد'], ['أروقة', 3], ['لدن', 0]]);
  });

  it('builds a template whose first sheet has the headers (required ones starred) that can be read back', async () => {
    const template = await buildTemplateBlob(columns, { template: 'Template', lists: 'Lists' });
    const { readSheet } = await import('read-excel-file/universal');
    expect(await readSheet(template)).toEqual([['الرمز *', 'الاسم *', 'الحالة']]);
    await expect(readImportFile(fileOf(template, 'x.xlsx'), columns)).rejects.toMatchObject({ reason: 'empty' });
  });

  it('matches uploaded headers by label (with or without the star) or by id, and keys cells by column id', async () => {
    const rows = await readImportFile(fileOf('الرمز *,name,الحالة\r\nARW,أروقة,نشط\r\n,,\r\nLDN,لدن,\r\n', 'a.csv'), columns);
    expect(rows).toEqual([{ rowNumber: 2, cells: { code: 'ARW', name: 'أروقة', status: 'نشط' } }, { rowNumber: 4, cells: { code: 'LDN', name: 'لدن', status: '' } }]);
  });

  it('refuses files that are empty, miss a required column, or are too big', async () => {
    const reason = async (file: File) => ((await readImportFile(file, columns).catch((e: unknown) => e)) as ImportFileError).reason;
    expect(await reason(fileOf('الرمز,الاسم\r\n', 'a.csv'))).toBe('empty');
    expect(await reason(fileOf('الرمز,الحالة\r\nA,نشط\r\n', 'a.csv'))).toBe('missingColumns');
    expect(await reason(fileOf('x'.repeat(6 * 1024 * 1024), 'a.csv'))).toBe('tooLarge');
    expect(await reason(fileOf(`الرمز,الاسم\r\n${'A,B\r\n'.repeat(1001)}`, 'a.csv'))).toBe('tooManyRows');
  });
});
