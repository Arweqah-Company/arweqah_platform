import { isPreviewable } from '@arweqah-platform/shared';
import { Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/core/api/api-client';
import { errorMessage } from '../lib/error-message';
import { Alert } from './alert';
import { Button } from './button';
import { Dialog } from './dialog';

export interface PreviewableFile {
  name: string;
  contentType: string;
  /** Where the bytes of an image or a PDF come from, and where the file downloads from (the API paths, with `/api` left out). */
  previewPath: string;
  downloadUrl: string;
}

/** The object URL of a previewable file, made when the window opens and released when it closes. */
function useObjectUrl(file: PreviewableFile): { url: string | null; error: unknown } {
  const [state, setState] = useState<{ url: string | null; error: unknown }>({ url: null, error: null });
  const ok = isPreviewable(file.contentType);
  useEffect(() => {
    if (!ok) return undefined;
    let made: string | null = null;
    let live = true;
    apiClient.blob(file.previewPath).then(
      (blob) => {
        made = URL.createObjectURL(blob);
        if (live) setState({ url: made, error: null });
        else URL.revokeObjectURL(made);
      },
      (error: unknown) => live && setState({ url: null, error }),
    );
    return () => {
      live = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [ok, file.previewPath]);
  return state;
}

/** What the window shows: a note for a type that cannot be shown, the loading or failure state, the image, or the PDF. */
function Body({ file, url, error }: { file: PreviewableFile; url: string | null; error: unknown }) {
  const { t } = useTranslation();
  if (!isPreviewable(file.contentType)) return <Alert tone="info">{t('files.notPreviewable')}</Alert>;
  if (error) return <Alert>{errorMessage(t, error)}</Alert>;
  if (!url) return <p role="status" className="text-sm text-muted">{t('files.loading')}</p>;
  if (file.contentType.toLowerCase().startsWith('application/pdf')) return <iframe src={url} title={file.name} className="h-[60vh] w-full rounded-xl border border-neutral-200" />;
  return <img src={url} alt={file.name} className="mx-auto max-h-[60vh] max-w-full rounded-xl object-contain" />;
}

/** A window inside the system that shows an image or a PDF; other types say so and offer the download. */
export function FilePreviewDialog({ file, onClose }: { file: PreviewableFile; onClose: () => void }) {
  const { t } = useTranslation();
  const { url, error } = useObjectUrl(file);
  return (
    <Dialog open xl onOpenChange={(open) => !open && onClose()} title={file.name}>
      <div className="flex flex-col gap-4">
        <Body file={file} url={url} error={error} />
        <div className="flex justify-end">
          <a href={file.downloadUrl} download>
            <Button type="button" variant="secondary"><Download className="size-4" aria-hidden />{t('files.download')}</Button>
          </a>
        </div>
      </div>
    </Dialog>
  );
}
