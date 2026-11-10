import { previewKindOf } from '@arweqah-platform/shared';
import { Download } from 'lucide-react';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/core/api/api-client';
import { errorMessage } from '../lib/error-message';
import { Alert } from './alert';
import { Button } from './button';
import { Dialog } from './dialog';

// Word and Excel are drawn by libraries that load only when such a file is opened.
const DocxView = lazy(() => import('./office-views').then((m) => ({ default: m.DocxView })));
const WorkbookView = lazy(() => import('./office-views').then((m) => ({ default: m.WorkbookView })));

export interface PreviewableFile {
  name: string;
  contentType: string;
  /** Where the bytes of an image or a PDF come from, and where the file downloads from (the API paths, with `/api` left out). */
  previewPath: string;
  downloadUrl: string;
}

/** The bytes of a previewable file, read from the API when the window opens. */
function useFileBlob(file: PreviewableFile): { blob: Blob | null; error: unknown } {
  const [state, setState] = useState<{ blob: Blob | null; error: unknown }>({ blob: null, error: null });
  const supported = previewKindOf(file.contentType) !== null;
  useEffect(() => {
    if (!supported) return undefined;
    let live = true;
    apiClient.blob(file.previewPath).then(
      (blob) => live && setState({ blob, error: null }),
      (error: unknown) => live && setState({ blob: null, error }),
    );
    return () => {
      live = false;
    };
  }, [supported, file.previewPath]);
  return state;
}

/** An object URL for an image or a PDF, released when the window closes. */
function useObjectUrl(blob: Blob | null): string | null {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  return url;
}

/** What the window shows once the bytes are there: the image, the PDF in a frame, or Word / Excel drawn by the page with a note that it is approximate. */
function Content({ file, blob }: { file: PreviewableFile; blob: Blob }) {
  const { t } = useTranslation();
  const kind = previewKindOf(file.contentType);
  const url = useObjectUrl(kind === 'image' || kind === 'pdf' ? blob : null);
  if (kind === 'pdf' && url) return <iframe src={url} title={file.name} className="h-[60vh] w-full rounded-xl border border-neutral-200" />;
  if (kind === 'image' && url) return <img src={url} alt={file.name} className="mx-auto max-h-[60vh] max-w-full rounded-xl object-contain" />;
  if (kind !== 'docx' && kind !== 'xlsx') return null;
  return (
    <div className="flex flex-col gap-3">
      <Alert tone="info">{t('files.approximate')}</Alert>
      <Suspense fallback={<p role="status" className="text-sm text-muted">{t('files.loading')}</p>}>{kind === 'docx' ? <DocxView blob={blob} /> : <WorkbookView blob={blob} />}</Suspense>
    </div>
  );
}

/** What the window shows: a note for a type that cannot be shown, the loading or failure state, or the content. */
function Body({ file }: { file: PreviewableFile }) {
  const { t } = useTranslation();
  const { blob, error } = useFileBlob(file);
  if (previewKindOf(file.contentType) === null) return <Alert tone="info">{t('files.notPreviewable')}</Alert>;
  if (error) return <Alert>{errorMessage(t, error)}</Alert>;
  if (!blob) return <p role="status" className="text-sm text-muted">{t('files.loading')}</p>;
  return <Content file={file} blob={blob} />;
}

/** A window inside the system that shows an image, a PDF, or a Word / Excel file; other types say so and offer the download. */
export function FilePreviewDialog({ file, onClose }: { file: PreviewableFile; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Dialog open xl onOpenChange={(open) => !open && onClose()} title={file.name}>
      <div className="flex flex-col gap-4">
        <Body file={file} />
        <div className="flex justify-end">
          <a href={file.downloadUrl} download>
            <Button type="button" variant="secondary"><Download className="size-4" aria-hidden />{t('files.download')}</Button>
          </a>
        </div>
      </div>
    </Dialog>
  );
}
