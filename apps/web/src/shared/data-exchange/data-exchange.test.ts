import { describe, expect, it } from 'vitest';
import { columnLetter, safeText } from './cells';
import { parseCsv, toCsv } from './csv';
import { buildExportBlob } from './export-file';
import { ImportFileError, readImportFile } from './read-sheet';
import { isIsoDate, normalizeDate, normalizePhone } from './mapping';
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

  it('accepts a day written 2024-1-5 or 2024/01/05 as 2024-01-05, and never guesses day / month order (FR-29)', () => {
    expect(['2024-1-5', '2024/01/05', '2024.1.5', '2024-01-05'].map(normalizeDate)).toEqual(['2024-01-05', '2024-01-05', '2024-01-05', '2024-01-05']);
    expect(normalizeDate('5/1/2024')).toBe('5/1/2024');
  });

  it('rejects a day that does not exist, and keeps a real leap day (FR-29, CodeRabbit PR 121)', () => {
    expect(['2023-02-29', '2024-04-31', '2024-13-01', '2024-00-10'].map((d) => isIsoDate(normalizeDate(d)))).toEqual([false, false, false, false]);
    expect(['2024/2/29', '2024-02-29', '2023-12-31'].map((d) => isIsoDate(normalizeDate(d)))).toEqual([true, true, true]);
  });

  it('does not turn a Saudi mobile whose leading zero Excel dropped (554840852) into +554840852 (FR-29, CodeRabbit PR 121)', () => {
    expect(normalizePhone('554840852')).toBe('554840852'); // left as typed, so the form rule refuses it and asks for a country code
    expect(normalizePhone('966554840852')).toBe('+966554840852');
  });

  it('restores the + that Excel drops from a phone, and never guesses a local number (FR-29)', () => {
    expect(['966554840852', '00966554840852', '+966554840852', '+966 55 484 0852', '966-55-484-0852'].map(normalizePhone)).toEqual(['+966554840852', '+966554840852', '+966554840852', '+966554840852', '+966554840852']);
    expect(normalizePhone('0554840852')).toBe('0554840852'); // no country code: left as typed, so the form rule refuses it
    expect(normalizePhone('12345')).toBe('12345');
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

  it('builds a template with a date column that tells the format when a cell is selected (FR-29)', async () => {
    const withDate: ImportColumn[] = [...columns, { id: 'born', header: 'تاريخ الميلاد', format: 'date' as const }];
    const template = await buildTemplateBlob(withDate, { template: 'Template', lists: 'Lists', prompts: { date: { title: 'Date format', text: 'Year-month-day' }, phone: { title: 'Phone', text: '+966501234567' } } });
    const { default: JSZip } = await import('jszip').catch(() => ({ default: null }));
    if (JSZip) {
      const xml = await (await JSZip.loadAsync(await template.arrayBuffer())).file('xl/worksheets/sheet1.xml')!.async('string');
      expect(xml).toContain('promptTitle="Date format"');
      expect(xml).toContain('prompt="Year-month-day"');
    }
    const { readSheet } = await import('read-excel-file/universal');
    expect((await readSheet(template))[0]).toContain('تاريخ الميلاد');
  });

  it('builds a template whose first sheet has the headers (required ones starred) that can be read back', async () => {
    const template = await buildTemplateBlob(columns, { template: 'Template', lists: 'Lists', prompts: { date: { title: 'Date format', text: 'Year-month-day' }, phone: { title: 'Phone', text: '+966501234567' } } });
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
