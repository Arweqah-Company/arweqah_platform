import type { FileDto } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { me, server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { FileAttachments } from './file-attachments';

const PNG = 'image/png';
const PPTX = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
const dto = (id: string, originalName: string, contentType: string): FileDto => ({ id, originalName, contentType, size: 4, createdAt: '2026-12-01T10:00:00.000Z' });

/** The box with its list kept by the page around it, as a form keeps it. */
function Box() {
  const [files, setFiles] = useState<FileDto[]>([]);
  return <FileAttachments files={files} onChange={setFiles} max={5} label="المرفقات" />;
}

/** The API answers each upload with the next file of `stored`, in the order they are sent (the test knows what it chose). */
function serve(stored: FileDto[], maxUploadMb = 10) {
  const asked: string[] = [];
  const queue = [...stored];
  server.use(
    http.get('*/api/me', () => HttpResponse.json({ ...me(), maxUploadMb })),
    http.post('*/api/files', () => HttpResponse.json(queue.shift(), { status: 201 })),
    http.get('*/api/files/:id/preview', ({ params }) => { asked.push(String(params.id)); return HttpResponse.arrayBuffer(new ArrayBuffer(4), { headers: { 'Content-Type': PNG } }); }),
  );
  return asked;
}

const choose = (files: File[]) => fireEvent.change(screen.getByLabelText('المرفقات'), { target: { files } });

describe('Checking an attachment before the form is sent (FR-192, FR-191)', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:local');
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => vi.restoreAllMocks());

  it('shows a thumbnail for a chosen picture, and a click opens it full size in the preview window', async () => {
    const asked = serve([dto('f1', 'screen.png', PNG)]);
    renderPage(<Box />);
    choose([new File(['x'], 'screen.png', { type: PNG })]);
    const open = await screen.findByRole('button', { name: 'معاينة screen.png' });
    expect(within(open).getByRole('presentation', { hidden: true })).toHaveAttribute('src', 'blob:local');
    fireEvent.click(open);
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(asked).toEqual(['f1']));
    await waitFor(() => expect(dialog.querySelector('img')).not.toBeNull());
    expect(within(dialog).getByRole('link', { name: /تنزيل/ })).toHaveAttribute('href', '/api/files/f1/content');
  });

  it('shows a file icon (no thumbnail) for a deck, which still opens in the preview window', async () => {
    serve([dto('f1', 'عرض.pptx', PPTX)]);
    renderPage(<Box />);
    choose([new File(['x'], 'عرض.pptx', { type: PPTX })]);
    const open = await screen.findByRole('button', { name: 'معاينة عرض.pptx' });
    expect(open.querySelector('img')).toBeNull();
  });

  it('lets a file that cannot be shown be removed without a preview button, and releases the thumbnail of a removed picture', async () => {
    serve([dto('f1', 'screen.png', PNG), dto('f2', 'data.csv', 'text/csv')]);
    renderPage(<Box />);
    choose([new File(['x'], 'screen.png', { type: PNG }), new File(['x'], 'data.csv', { type: 'text/csv' })]);
    await screen.findByRole('button', { name: 'معاينة screen.png' });
    fireEvent.click(screen.getByRole('button', { name: 'إزالة screen.png' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'معاينة screen.png' })).not.toBeInTheDocument());
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:local');
    expect(screen.getByRole('button', { name: 'إزالة data.csv' })).toBeInTheDocument();
  });

  it('shows the size the administrator set in the box and refuses a file over it', async () => {
    serve([], 50);
    renderPage(<Box />);
    expect(await screen.findByText('حتى 50 ميجابايت')).toBeInTheDocument();
    const big = new File(['x'], 'big.pptx', { type: PPTX });
    Object.defineProperty(big, 'size', { value: 51 * 1024 * 1024 });
    choose([big]);
    expect(await screen.findByRole('alert')).toHaveTextContent(/50/);
    expect(screen.queryByRole('button', { name: 'إزالة big.pptx' })).not.toBeInTheDocument();
  });
});
