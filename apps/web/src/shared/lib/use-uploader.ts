import type { FileDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/core/api/api-client';
import { errorMessage } from './error-message';
import { useLatest } from './use-latest';

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
  /** Called when files start and stop uploading, in the same step as the list changes, so a form that waits for the upload never lags behind the list it shows. */
  onBusyChange?: (busy: boolean) => void;
}

function toForm(file: File): FormData {
  const form = new FormData();
  form.append('file', file);
  return form;
}

/** Uploads each file as soon as it is chosen and keeps the list (the caller owns it): the one upload path of every file box (attachments of a ticket, the pictures of the assistant). */
export function useUploader({ files, onChange, max, path = '/files', onUploaded, onRemoved, onBusyChange }: Options) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The list as it is when an upload ends: the page may have changed it meanwhile (a file taken out, the list sent and emptied).
  const current = useLatest(files);

  const pick = async (picked: File[]): Promise<void> => {
    if (files.length + picked.length > max) return setError(t('attachments.tooMany', { max }));
    setBusy(true);
    onBusyChange?.(true);
    setError(null);
    try {
      const uploaded: FileDto[] = [];
      for (const file of picked) {
        const stored = await apiClient.post<FileDto>(path, toForm(file));
        uploaded.push(stored);
        onUploaded?.(file, stored);
      }
      // The list may have grown while the files were on their way: only what fits is added, and the rest is told, not dropped silently.
      const room = Math.max(0, max - current.current.length);
      onChange([...current.current, ...uploaded.slice(0, room)]);
      if (uploaded.length > room) setError(t('attachments.tooMany', { max }));
    } catch (failure) {
      setError(errorMessage(t, failure) || t('attachments.failed'));
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  };

  const remove = (file: FileDto): void => {
    onRemoved?.(file);
    onChange(files.filter((x) => x.id !== file.id));
  };

  return { busy, error, setError, pick, remove };
}
