import type { FileDto } from '@arweqah-platform/shared';
import { Paperclip, X } from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/core/api/api-client';
import { errorMessage } from '../lib/error-message';
import { Alert } from './alert';
import { Button } from './button';

interface Props {
  files: FileDto[];
  onChange: (files: FileDto[]) => void;
  max: number;
  /** Accessible name of the picker. */
  label: string;
}

/** Picks files, uploads each as soon as it is chosen, and lists them with a remove button. The caller keeps the ids. */
export function FileAttachments({ files, onChange, max, label }: Props) {
  const { t } = useTranslation();
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (picked: FileList | null) => {
    if (!picked?.length) return;
    if (files.length + picked.length > max) return setError(t('attachments.tooMany', { max }));
    setBusy(true);
    setError(null);
    try {
      const uploaded: FileDto[] = [];
      for (const file of Array.from(picked)) uploaded.push(await apiClient.post<FileDto>('/files', toForm(file)));
      onChange([...files, ...uploaded]);
    } catch (failure) {
      setError(errorMessage(t, failure) || t('attachments.failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {error && <Alert>{error}</Alert>}
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="secondary" size="sm" className="cursor-pointer">
          <label htmlFor={id}>
            <Paperclip className="size-4" aria-hidden />
            {busy ? t('attachments.uploading') : t('attachments.add')}
          </label>
        </Button>
        <input id={id} type="file" multiple className="sr-only" aria-label={label} disabled={busy || files.length >= max} onChange={(e) => { void pick(e.target.files); e.target.value = ''; }} />
        <span className="text-xs text-muted">{t('attachments.hint')}</span>
      </div>
      {files.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-1 rounded-full bg-neutral-50 py-1 ps-3 pe-1 text-xs">
              <span dir="ltr">{f.originalName}</span>
              <button type="button" aria-label={t('attachments.remove', { name: f.originalName })} className="grid size-6 place-items-center rounded-full hover:bg-neutral-200/60" onClick={() => onChange(files.filter((x) => x.id !== f.id))}>
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function toForm(file: File): FormData {
  const form = new FormData();
  form.append('file', file);
  return form;
}
