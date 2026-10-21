import { safeText } from './cells';
import { toCsv } from './csv';
import type { ExportColumn, ExportFormat } from './types';

/** The file for the chosen columns and rows. Excel is built on demand so its code is only loaded when someone exports. */
export async function buildExportBlob<T>(format: ExportFormat, columns: ExportColumn<T>[], rows: T[]): Promise<Blob> {
  const table = rows.map((row) => columns.map((c) => c.value(row)));
  const header = columns.map((c) => c.header);
  if (format === 'csv') return new Blob([toCsv(header, table)], { type: 'text/csv;charset=utf-8' });
  const { default: writeXlsxFile } = await import('write-excel-file/universal');
  const data = [header.map((value) => ({ value, fontWeight: 'bold' as const })), ...table.map((r) => r.map((cell) => (typeof cell === 'number' || typeof cell === 'boolean' ? cell : safeText(cell))))];
  return writeXlsxFile(data, { sheet: 'Export', columns: columns.map((c) => ({ width: Math.max(12, Math.min(40, c.header.length + 4)) })) }).toBlob();
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement('a'), { href: url, download: filename });
  link.click();
  URL.revokeObjectURL(url);
}

/** `employees-2026-10-21.xlsx` */
export const exportFilename = (base: string, format: ExportFormat): string => `${base}-${new Date().toISOString().slice(0, 10)}.${format}`;
