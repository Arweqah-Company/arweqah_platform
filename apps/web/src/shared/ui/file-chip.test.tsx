import writeXlsxFile from 'write-excel-file/universal';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '../../../test/msw';
import { FileChip } from './file-chip';

const file = (over: Partial<Parameters<typeof FileChip>[0]['file']> = {}) => ({ name: 'screen.png', contentType: 'image/png', previewPath: '/tickets/t1/attachments/f1/preview', downloadUrl: '/api/tickets/t1/attachments/f1', ...over });

describe('FileChip: a «View» button beside every attached file (FR-128)', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => vi.restoreAllMocks());

  it('keeps the name as the download link and opens an image in a window inside the system', async () => {
    server.use(http.get('*/api/tickets/t1/attachments/f1/preview', () => HttpResponse.arrayBuffer(new ArrayBuffer(4), { headers: { 'Content-Type': 'image/png' } })));
    render(<FileChip file={file()} />);
    expect(screen.getByRole('link', { name: 'screen.png' })).toHaveAttribute('href', '/api/tickets/t1/attachments/f1');
    fireEvent.click(screen.getByRole('button', { name: 'عرض screen.png' }));
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(dialog.querySelector('img')).toHaveAttribute('src', 'blob:preview'));
    expect(screen.getByRole('link', { name: /تنزيل/ })).toHaveAttribute('href', '/api/tickets/t1/attachments/f1');
  });

  it('shows a PDF in a frame', async () => {
    server.use(http.get('*/api/tickets/t1/attachments/f1/preview', () => HttpResponse.arrayBuffer(new ArrayBuffer(4), { headers: { 'Content-Type': 'application/pdf' } })));
    render(<FileChip file={file({ name: 'a.pdf', contentType: 'application/pdf' })} />);
    fireEvent.click(screen.getByRole('button', { name: 'عرض a.pdf' }));
    await waitFor(() => expect(screen.getByTitle('a.pdf')).toHaveAttribute('src', 'blob:preview'));
  });

  it('says a type that cannot be shown must be downloaded, and asks the server for nothing', async () => {
    let asked = false;
    server.use(http.get('*/api/tickets/t1/attachments/f1/preview', () => { asked = true; return new HttpResponse(null, { status: 500 }); }));
    render(<FileChip file={file({ name: 'a.doc', contentType: 'application/msword' })} />);
    fireEvent.click(screen.getByRole('button', { name: 'عرض a.doc' }));
    expect(await screen.findByText(/لا يمكن عرض هذا النوع/)).toBeInTheDocument();
    expect(asked).toBe(false);
  });

  it('shows the server’s refusal when the file cannot be read', async () => {
    server.use(http.get('*/api/tickets/t1/attachments/f1/preview', () => HttpResponse.json({ code: 'NOT_FOUND', message: 'x' }, { status: 404 })));
    render(<FileChip file={file()} />);
    fireEvent.click(screen.getByRole('button', { name: 'عرض screen.png' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('draws an Excel file as a table, with a note that the view is approximate', async () => {
    const xlsx = await writeXlsxFile([[{ value: 'الاسم' }], ['سارة']], { sheet: 'الأولى' }).toBlob();
    server.use(http.get('*/api/tickets/t1/attachments/f1/preview', async () => HttpResponse.arrayBuffer(await xlsx.arrayBuffer())));
    render(<FileChip file={file({ name: 'a.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })} />);
    fireEvent.click(screen.getByRole('button', { name: 'عرض a.xlsx' }));
    expect(await screen.findByText('سارة')).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText(/عرض تقريبي/)).toBeInTheDocument();
  });

  it('says so when an Office file cannot be read, and still offers the download', async () => {
    server.use(http.get('*/api/tickets/t1/attachments/f1/preview', () => HttpResponse.arrayBuffer(new ArrayBuffer(8))));
    render(<FileChip file={file({ name: 'bad.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })} />);
    fireEvent.click(screen.getByRole('button', { name: 'عرض bad.xlsx' }));
    expect(await screen.findByText(/تعذّرت قراءة الملف/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /تنزيل/ })).toBeInTheDocument();
  });
});
