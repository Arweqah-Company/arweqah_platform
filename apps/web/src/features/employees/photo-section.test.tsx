import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { server } from '../../../test/msw';
import { employeeFixture, openEmployeePage } from '../../../test/employees-fixtures';

const CAN = ['employees.view', 'employees.photo_update'];
const open = (keys: string[], photoFileId: string | null) => openEmployeePage(keys, employeeFixture({ photoFileId }));

afterEach(() => vi.unstubAllGlobals());

describe('Employee profile photo on the page (FR-91)', () => {
  it('offers to add a photo to who may change it', async () => {
    open(CAN, null);
    fireEvent.click(await screen.findByRole('button', { name: 'إضافة صورة' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText('اختر الصورة')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'حفظ الصورة' })).toBeDisabled();
  });

  it('refuses a file that is not a JPEG or PNG before any upload', async () => {
    open(CAN, null);
    fireEvent.click(await screen.findByRole('button', { name: 'إضافة صورة' }));
    const dialog = await screen.findByRole('dialog');
    const input = dialog.querySelector('input[type=file]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['x'], 'doc.pdf', { type: 'application/pdf' })] } });
    expect(await within(dialog).findByText(/نوع الملف غير مسموح/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'حفظ الصورة' })).toBeDisabled();
  });

  it('removes the photo after a confirmation', async () => {
    let removed = false;
    server.use(http.delete('*/api/employees/e1/photo', () => { removed = true; return new HttpResponse(null, { status: 204 }); }));
    open(CAN, 'f1');
    fireEvent.click(await screen.findByRole('button', { name: 'إزالة الصورة' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'إزالة الصورة' }));
    await waitFor(() => expect(removed).toBe(true));
  });

  it('shows no photo buttons without the key', async () => {
    open(['employees.view'], 'f1');
    await screen.findByRole('heading', { name: 'الصورة الشخصية' });
    expect(screen.queryByRole('button', { name: 'تغيير الصورة' })).not.toBeInTheDocument();
  });

  it('lets go of the temporary link of a picture the browser cannot read', async () => {
    const revoked: string[] = [];
    Object.assign(URL, { createObjectURL: () => 'blob:unreadable', revokeObjectURL: (u: string) => revoked.push(u) });
    vi.stubGlobal('Image', class { onload: (() => void) | null = null; onerror: (() => void) | null = null; set src(_value: string) { queueMicrotask(() => this.onerror?.()); } });
    open(CAN, null);
    fireEvent.click(await screen.findByRole('button', { name: 'إضافة صورة' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(dialog.querySelector('input[type=file]') as HTMLInputElement, { target: { files: [new File(['x'], 'broken.png', { type: 'image/png' })] } });
    expect(await within(dialog).findByText('تعذّرت قراءة الصورة.')).toBeInTheDocument();
    expect(revoked).toEqual(['blob:unreadable']);
  });
});
