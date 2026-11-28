import type { FileDto } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { me, server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { slowUploads } from '../../../test/slow-upload';
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

  it('makes no local address for a picture whose upload ends after the box was closed (nothing would release it)', async () => {
    const posted: string[] = [];
    server.use(
      http.get('*/api/me', () => HttpResponse.json({ ...me(), maxUploadMb: 10 })),
      http.post('*/api/files', async () => { posted.push('x'); await delay(120); posted.push('done'); return HttpResponse.json(dto('f1', 'screen.png', PNG), { status: 201 }); }),
    );
    const { unmount } = renderPage(<Box />);
    choose([new File(['x'], 'screen.png', { type: PNG })]);
    unmount();
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(posted).toEqual(['x', 'done']); // the upload did run to its end
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});

describe('The box while files are on their way (review of PR 196)', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:local');
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => vi.restoreAllMocks());

  it('tells the page while a file is uploading, so a form can wait for it (review of PR 196)', async () => {
    const busy: boolean[] = [];
    server.use(http.get('*/api/me', () => HttpResponse.json(me())));
    const slow = slowUploads([dto('f1', 'a.png', PNG)]);
    function Watched() {
      const [files, setFiles] = useState<FileDto[]>([]);
      return <FileAttachments files={files} onChange={setFiles} max={5} label="المرفقات" onBusyChange={(b) => busy.push(b)} />;
    }
    renderPage(<Watched />);
    fireEvent.change(await screen.findByLabelText('المرفقات'), { target: { files: [new File(['x'], 'a.png', { type: PNG })] } });
    await waitFor(() => expect(busy).toEqual([true]));
    slow.release();
    expect(await screen.findByRole('button', { name: 'معاينة a.png' })).toBeInTheDocument();
    expect(busy).toEqual([true, false]);
  });

  it('adds the stored file to the list as it is when the upload ends, not to the list it had when it began (review of PR 196)', async () => {
    server.use(http.get('*/api/me', () => HttpResponse.json(me())));
    const slow = slowUploads([dto('late', 'late.png', PNG)]);
    function Changing() {
      const [files, setFiles] = useState<FileDto[]>([]);
      return (
        <>
          <FileAttachments files={files} onChange={setFiles} max={5} label="المرفقات" />
          <button type="button" onClick={() => setFiles([dto('other', 'other.png', PNG)])}>غيّر القائمة</button>
        </>
      );
    }
    renderPage(<Changing />);
    fireEvent.change(await screen.findByLabelText('المرفقات'), { target: { files: [new File(['x'], 'late.png', { type: PNG })] } });
    fireEvent.click(screen.getByRole('button', { name: 'غيّر القائمة' }));
    slow.release();
    expect(await screen.findByRole('button', { name: 'معاينة late.png' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'معاينة other.png' })).toBeInTheDocument();
  });

  it('does not push the list past its limit when a file was added to it while the upload was on its way (review of PR 196)', async () => {
    server.use(http.get('*/api/me', () => HttpResponse.json(me())));
    const slow = slowUploads([dto('u1', 'u1.png', PNG), dto('u2', 'u2.png', PNG)]);
    function Limited() {
      const [files, setFiles] = useState<FileDto[]>([]);
      return (
        <>
          <FileAttachments files={files} onChange={setFiles} max={2} label="المرفقات" />
          <button type="button" onClick={() => setFiles([dto('other', 'other.png', PNG)])}>أضف ملفًا</button>
          <output data-testid="count">{files.length}</output>
        </>
      );
    }
    renderPage(<Limited />);
    fireEvent.change(await screen.findByLabelText('المرفقات'), { target: { files: [new File(['x'], 'u1.png', { type: PNG }), new File(['y'], 'u2.png', { type: PNG })] } });
    fireEvent.click(screen.getByRole('button', { name: 'أضف ملفًا' }));
    slow.release();
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByTestId('count')).toHaveTextContent('2');
    expect(screen.getByRole('button', { name: 'معاينة other.png' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'معاينة u1.png' })).toBeInTheDocument();
  });
});
