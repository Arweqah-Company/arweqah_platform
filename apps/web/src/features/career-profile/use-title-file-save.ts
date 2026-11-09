import type { TitleFileResultDto } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ApiError } from '@/core/api/api-client';
import { useConfirmTitleFile, useReadTitleFile } from './api';

/**
 * Saving what the dialog shows: a reading by the fixed reader is saved from the text again (`dryRun: false`); a reading by the AI is saved
 * from the content the person reviewed (`confirm`), never by asking the AI a second time.
 */
export function useTitleFileSave(titleId: string, text: string, result: TitleFileResultDto | null, onSaved: () => void) {
  const { t } = useTranslation('career-profile');
  const fromText = useReadTitleFile(titleId);
  const fromContent = useConfirmTitleFile(titleId);
  const active = result?.source === 'ai' ? fromContent : fromText;
  const done = (version: number | null) => {
    toast.success(t('file.saved', { version }));
    onSaved();
  };
  const submit = () => {
    if (result?.source === 'ai' && result.content) fromContent.mutate({ content: result.content, expectedVersion: result.baseVersion ?? 0 }, { onSuccess: (saved) => done(saved.version) });
    else fromText.mutate({ text, dryRun: false }, { onSuccess: (saved) => done(saved.version) });
  };
  const failed = active.error instanceof ApiError ? t('file.saveRefused') : active.isError ? t('file.saveFailed') : null;
  return { submit, pending: active.isPending, failed };
}
