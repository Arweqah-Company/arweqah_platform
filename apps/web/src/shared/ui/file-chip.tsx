import { Eye, Paperclip } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FilePreviewDialog, type PreviewableFile } from './file-preview-dialog';

/** An attached file: its name (downloads) and a «View» button that opens it in a window inside the system. */
export function FileChip({ file }: { file: PreviewableFile }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-neutral-50 ps-3 pe-1 text-xs">
      <a href={file.downloadUrl} className="inline-flex items-center gap-1.5 py-1 text-link hover:underline">
        <Paperclip className="size-3.5" aria-hidden />
        <span dir="ltr">{file.name}</span>
      </a>
      <button type="button" onClick={() => setOpen(true)} aria-label={t('files.viewNamed', { name: file.name })} className="inline-flex items-center gap-1 rounded-full px-2 py-1 font-medium text-link hover:bg-petrol-50">
        <Eye className="size-3.5" aria-hidden />
        {t('actions.view')}
      </button>
      {open && <FilePreviewDialog file={file} onClose={() => setOpen(false)} />}
    </span>
  );
}
