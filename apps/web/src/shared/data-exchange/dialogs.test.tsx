import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExportDialog } from './export-dialog';
import { ImportDialog } from './import-dialog';
import type { ImportColumn, PreparedRow, SheetRow } from './types';

const saved: Blob[] = [];
beforeEach(() => {
  saved.length = 0;
  vi.stubGlobal('URL', { ...URL, createObjectURL: (b: Blob) => { saved.push(b); return 'blob:x'; }, revokeObjectURL: () => undefined });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
});
afterEach(() => vi.restoreAllMocks());

const rows = [{ name: 'أروقة', code: 'ARW' }, { name: 'لدن', code: 'LDN' }];
const exportColumns = [{ id: 'name', header: 'الاسم', value: (r: (typeof rows)[0]) => r.name }, { id: 'code', header: 'الرمز', value: (r: (typeof rows)[0]) => r.code }];

describe('Export dialog (FR-28)', () => {
  it('exports the chosen scope and columns as CSV', async () => {
    const loadAll = vi.fn(async () => [...rows, { name: 'حكينا', code: 'HKN' }]);
    render(<ExportDialog open onOpenChange={() => undefined} columns={exportColumns} filename="companies" pageRows={rows} total={3} loadAll={loadAll} />);
    expect(screen.getByText('2 من 2 أعمدة')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('الرمز'));
    expect(screen.getByText('1 من 2 أعمدة')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/كل النتائج/));
    fireEvent.click(screen.getByLabelText('ملف CSV (.csv)'));
    fireEvent.click(screen.getByRole('button', { name: 'تصدير' }));
    await waitFor(() => expect(saved).toHaveLength(1));
    expect(loadAll).toHaveBeenCalledOnce();
    expect(await saved[0]?.text()).toContain('الاسم\r\nأروقة\r\nلدن\r\nحكينا');
  });

  it('cannot export without a column', () => {
    render(<ExportDialog open onOpenChange={() => undefined} columns={exportColumns} filename="x" pageRows={rows} total={2} loadAll={async () => rows} />);
    fireEvent.click(screen.getByRole('button', { name: 'إلغاء التحديد' }));
    expect(screen.getByRole('button', { name: 'تصدير' })).toBeDisabled();
  });
});

describe('Import dialog (FR-29)', () => {
  const columns: ImportColumn[] = [{ id: 'code', header: 'الرمز', required: true }, { id: 'name', header: 'الاسم', required: true }];
  const created: string[] = [];
  const prepare = (sheet: SheetRow[]): PreparedRow[] =>
    sheet.map((r) => ({
      rowNumber: r.rowNumber,
      errors: r.cells.name ? [] : ['الاسم مطلوب'],
      run: r.cells.name ? async () => { if (r.cells.code === 'BAD') throw new Error('x'); created.push(r.cells.code as string); } : undefined,
    }));

  it('checks the rows, imports the valid ones, and reports the ones the server refused', async () => {
    created.length = 0;
    render(<ImportDialog open onOpenChange={() => undefined} filename="companies" columns={columns} prepare={prepare} />);
    const file = new File(['الرمز,الاسم\r\nARW,أروقة\r\nXX,\r\nBAD,سيء\r\n'], 'c.csv');
    fireEvent.change(document.querySelector('input[type=file]') as HTMLInputElement, { target: { files: [file] } });
    expect(await screen.findByText(/2 صف سليم، 1 صف فيه أخطاء من أصل 3/)).toBeInTheDocument();
    expect(screen.getByText(/الصف 3/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'استيراد 2 صف' }));
    expect(await screen.findByText('تم استيراد 1 صف، وفشل 1.')).toBeInTheDocument();
    expect(created).toEqual(['ARW']);
    expect(screen.getByRole('button', { name: 'تنزيل تقرير الأخطاء' })).toBeInTheDocument();
  });

  it('says what is wrong with the file instead of failing silently', async () => {
    render(<ImportDialog open onOpenChange={() => undefined} filename="c" columns={columns} prepare={prepare} />);
    fireEvent.change(document.querySelector('input[type=file]') as HTMLInputElement, { target: { files: [new File(['الاسم\r\nx\r\n'], 'c.csv')] } });
    expect(await screen.findByText(/أعمدة مطلوبة ناقصة: الرمز/)).toBeInTheDocument();
  });
});
