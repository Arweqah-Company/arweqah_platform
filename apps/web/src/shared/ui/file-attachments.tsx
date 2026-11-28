import { previewKindOf, type FileDto } from '@arweqah-platform/shared';
import { FileText, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMaxUploadBytes } from '../lib/use-max-upload';
import { useUploader } from '../lib/use-uploader';
import { Alert } from './alert';
import { FileDropzone } from './file-dropzone';
import { FilePreviewDialog, type PreviewableFile } from './file-preview-dialog';

interface Props {
  files: FileDto[];
  onChange: (files: FileDto[]) => void;
  max: number;
  /** Accessible name of the picker. */
  label: string;
  /** A shorter drop box for composers. */
  compact?: boolean;
  /** Told when a file starts and stops uploading, so the form around the box can wait for it before it sends (a file still on its way is not in the list yet). */
  onBusyChange?: (busy: boolean) => void;
}

/** Where the uploader reads their own stored file back (the preview window and the download); the file belongs to the box until the form is sent. */
const previewable = (f: FileDto): PreviewableFile => ({ name: f.originalName, contentType: f.contentType, previewPath: `/files/${f.id}/preview`, downloadUrl: `/api/files/${f.id}/content` });

/** The pictures the person chose, kept as local addresses so a thumbnail shows at once; each is released when its file leaves the list or the box closes. */
function useThumbnails() {
  const urls = useRef(new Map<string, string>());
  const mounted = useRef(true);
  const [, bump] = useState(0);
  useEffect(() => {
    const held = urls.current;
    mounted.current = true;
    return () => {
      mounted.current = false;
      held.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);
  return {
    of: (id: string) => urls.current.get(id),
    keep: (chosen: File, stored: FileDto) => {
      if (!mounted.current || previewKindOf(stored.contentType) !== 'image') return; // a box that was closed during the upload keeps no address that nothing would release
      urls.current.set(stored.id, URL.createObjectURL(chosen));
      bump((n) => n + 1);
    },
    drop: (id: string) => {
      const url = urls.current.get(id);
      if (url) URL.revokeObjectURL(url);
      urls.current.delete(id);
    },
  };
}

/** One chosen file: a thumbnail for a picture, a file icon for the rest, its name, a click to look at it full size (when it can be shown) and a remove button. */
function ChosenFile({ file, thumb, onOpen, onRemove }: { file: FileDto; thumb?: string; onOpen: () => void; onRemove: () => void }) {
  const { t } = useTranslation();
  const canShow = previewKindOf(file.contentType) !== null;
  const look = (
    <>
      {thumb ? <img src={thumb} alt="" className="size-14 rounded-lg border border-neutral-200 object-cover" /> : <span aria-hidden className="grid size-14 place-items-center rounded-lg border border-neutral-200 bg-white text-muted"><FileText className="size-6" /></span>}
      <span dir="ltr" className="max-w-32 truncate text-xs">{file.originalName}</span>
    </>
  );
  return (
    <li className="relative flex flex-col items-center gap-1 rounded-xl bg-neutral-50 p-2">
      {canShow ? <button type="button" aria-label={t('attachments.preview', { name: file.originalName })} className="flex flex-col items-center gap-1 rounded-lg hover:opacity-80" onClick={onOpen}>{look}</button> : <div className="flex flex-col items-center gap-1">{look}</div>}
      <button type="button" aria-label={t('attachments.remove', { name: file.originalName })} className="absolute -end-2 -top-2 grid size-6 place-items-center rounded-full border border-neutral-200 bg-white hover:bg-neutral-100" onClick={onRemove}>
        <X className="size-3.5" aria-hidden />
      </button>
    </li>
  );
}

/** Picks files, uploads each as soon as it is chosen, and lists them (a thumbnail that opens full size, and a remove button) so the right one can be checked before sending. The caller keeps the ids. */
export function FileAttachments({ files, onChange, max, label, compact, onBusyChange }: Props) {
  const { t } = useTranslation();
  const maxBytes = useMaxUploadBytes();
  const thumbs = useThumbnails();
  const [opened, setOpened] = useState<FileDto | null>(null);
  const { busy, error, pick, remove } = useUploader({ files, onChange, max, onUploaded: thumbs.keep, onRemoved: (f) => thumbs.drop(f.id), onBusyChange });
  return (
    <div className="flex flex-col gap-2">
      {error && <Alert>{error}</Alert>}
      <FileDropzone multiple compact={compact} label={label} maxBytes={maxBytes} busy={busy} disabled={files.length >= max} hint={t('attachments.hint')} onFiles={(picked) => void pick(picked)} />
      {files.length > 0 && (
        <ul className="flex flex-wrap gap-3 pt-1">
          {files.map((f) => <ChosenFile key={f.id} file={f} thumb={thumbs.of(f.id)} onOpen={() => setOpened(f)} onRemove={() => remove(f)} />)}
        </ul>
      )}
      {opened && <FilePreviewDialog file={previewable(opened)} onClose={() => setOpened(null)} />}
    </div>
  );
}
