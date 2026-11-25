import type { FileDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/core/api/api-client';
import { errorMessage } from './error-message';

interface Options {
  files: FileDto[];
  onChange: (files: FileDto[]) => void;
  max: number;
  /** Where each file is uploaded (the API path, `/api` left out). */
  path?: string;
  /** Called for each file once it is stored, with the file the person chose (a picture keeps a local preview of it). */
  onUploaded?: (chosen: File, stored: FileDto) => void;
  /** Called for a file the person takes out of the list. */
  onRemoved?: (file: FileDto) => void;
}

function toForm(file: File): FormData {
  const form = new FormData();
  form.append('file', file);
  return form;
}

/** Uploads each file as soon as it is chosen and keeps the list (the caller owns it): the one upload path of every file box (attachments of a ticket, the pictures of the assistant). */
export function useUploader({ files, onChange, max, path = '/files', onUploaded, onRemoved }: Options) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (picked: File[]): Promise<void> => {
    if (files.length + picked.length > max) return setError(t('attachments.tooMany', { max }));
    setBusy(true);
    setError(null);
    try {
      const uploaded: FileDto[] = [];
      for (const file of picked) {
        const stored = await apiClient.post<FileDto>(path, toForm(file));
        uploaded.push(stored);
        onUploaded?.(file, stored);
      }
      onChange([...files, ...uploaded]);
    } catch (failure) {
      setError(errorMessage(t, failure) || t('attachments.failed'));
    } finally {
      setBusy(false);
    }
  };

  const remove = (file: FileDto): void => {
    onRemoved?.(file);
    onChange(files.filter((x) => x.id !== file.id));
  };

  return { busy, error, setError, pick, remove };
}
