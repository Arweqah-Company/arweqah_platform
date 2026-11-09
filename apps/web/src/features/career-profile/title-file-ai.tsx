import { CorePermission, type TitleFileResultDto } from '@arweqah-platform/shared';
import { useMutation } from '@tanstack/react-query';
import { Loader2, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '@/core/api/api-client';
import { Can } from '@/core/permissions/can';
import { Alert, Badge, Button } from '@/shared/ui';
import { analyzeTitleFile } from './api';

const AI_ERRORS: readonly string[] = ['AI_NOT_CONFIGURED', 'AI_UNAVAILABLE', 'TITLE_FILE_AI_RATE_LIMITED'];

/** What to tell the person when the AI could not answer: the reason in words, or a general one. */
const problemOf = (error: unknown): string => (error instanceof ApiError && AI_ERRORS.includes(error.code) ? error.code : 'generic');

/**
 * Offered when the fixed reader found something to fix and an AI service is switched on: the AI places the parts of the file in any order
 * (plan §2.9). It saves nothing; the person reviews its answer in the same table of findings before «Save».
 */
export function AiOffer({ titleId, text, onResult }: { titleId: string; text: string; /** `sent` is the text the answer is about: the dialog drops the answer when the box holds something else by now. */
  onResult: (result: TitleFileResultDto, sent: string) => void }) {
  const { t } = useTranslation('career-profile');
  const analyze = useMutation({ mutationFn: (sent: string) => analyzeTitleFile(titleId, { text: sent }), onSuccess: (result, sent) => onResult(result, sent) });
  return (
    <Can permission={CorePermission.CareerTitlefileAi}>
      <div className="flex flex-col gap-3">
        <Alert tone="info">{t('file.ai.offer')} {t('file.ai.notice')}</Alert>
        <div>
          <Button variant="secondary" disabled={analyze.isPending} onClick={() => analyze.mutate(text)}>
            <Sparkles className="size-4" aria-hidden />
            {t('file.ai.button')}
          </Button>
        </div>
        {analyze.isPending && (
          <p role="status" className="flex items-center gap-2 text-sm text-muted">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {t('file.ai.running')}
          </p>
        )}
        {analyze.isError && <Alert tone="danger">{t(`file.ai.errors.${problemOf(analyze.error)}`)}</Alert>}
      </div>
    </Can>
  );
}

/** What is special about a reading the AI made: it is marked as such, and the texts that are not in the file word for word are listed. */
export function AiNotes({ result }: { result: TitleFileResultDto }) {
  const { t } = useTranslation('career-profile');
  if (result.source !== 'ai') return null;
  return (
    <div className="flex flex-col gap-3">
      <div><Badge tone="warning">{t('file.ai.badge')}</Badge></div>
      {result.ungrounded.length > 0 && (
        <Alert tone="warning">
          <b>{t('file.ai.ungroundedTitle')}</b>
          <ul className="mt-1 list-disc ps-5">{result.ungrounded.map((text) => <li key={text} dir="auto">{text}</li>)}</ul>
        </Alert>
      )}
    </div>
  );
}
