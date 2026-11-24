import { MAX_UPLOAD_BYTES, type FileDto } from '@arweqah-platform/shared';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUploader } from '../lib/use-uploader';
import { Alert } from './alert';
import { FileDropzone } from './file-dropzone';

interface Props {
  files: FileDto[];
  onChange: (files: FileDto[]) => void;
  max: number;
  /** Accessible name of the picker. */
  label: string;
  /** A shorter drop box for composers. */
  compact?: boolean;
}

/** Picks files, uploads each as soon as it is chosen, and lists them with a remove button. The caller keeps the ids. */
export function FileAttachments({ files, onChange, max, label, compact }: Props) {
  const { t } = useTranslation();
  const { busy, error, pick, remove } = useUploader({ files, onChange, max });

  return (
    <div className="flex flex-col gap-2">
      {error && <Alert>{error}</Alert>}
      <FileDropzone multiple compact={compact} label={label} maxBytes={MAX_UPLOAD_BYTES} busy={busy} disabled={files.length >= max} hint={t('attachments.hint')} onFiles={(picked) => void pick(picked)} />
      {files.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-1 rounded-full bg-neutral-50 py-1 ps-3 pe-1 text-xs">
              <span dir="ltr">{f.originalName}</span>
              <button type="button" aria-label={t('attachments.remove', { name: f.originalName })} className="grid size-6 place-items-center rounded-full hover:bg-neutral-200/60" onClick={() => remove(f)}>
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
