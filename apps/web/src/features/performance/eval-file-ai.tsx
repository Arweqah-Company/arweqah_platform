import { CorePermission, type EvalFileResult } from '@arweqah-platform/shared';
import { useMutation } from '@tanstack/react-query';
import { Loader2, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '@/core/api/api-client';
import { Can } from '@/core/permissions/can';
import { Alert, Badge, Button } from '@/shared/ui';
import { analyzeEvalFile } from './api';

const AI_ERRORS: readonly string[] = ['AI_NOT_CONFIGURED', 'AI_UNAVAILABLE', 'EVAL_FILE_AI_RATE_LIMITED'];
const problemOf = (error: unknown): string => (error instanceof ApiError && AI_ERRORS.includes(error.code) ? error.code : 'generic');

/** The AI reads the evaluation file in any order and places its parts; it saves nothing, and the person reviews the answer in the same table before «Save». Shown while an AI service is on. */
export function AiOffer({ text, onResult }: { text: string; /** `sent` is the text the answer is about: the dialog drops the answer when the box holds something else by now. */
  onResult: (result: EvalFileResult, sent: string) => void }) {
  const { t } = useTranslation('performance');
  const analyze = useMutation({ mutationFn: (sent: string) => analyzeEvalFile(sent), onSuccess: (result, sent) => onResult(result, sent) });
  return (
    <Can permission={CorePermission.PerformanceTemplateAi}>
      <div className="flex flex-col gap-3">
        <Alert tone="info">{t('file.ai.offer')} {t('file.ai.notice')}</Alert>
        <div><Button variant="secondary" disabled={analyze.isPending || !text.trim()} onClick={() => analyze.mutate(text)}><Sparkles className="size-4" aria-hidden />{t('file.ai.button')}</Button></div>
        {analyze.isPending && <p role="status" className="flex items-center gap-2 text-sm text-muted"><Loader2 className="size-4 animate-spin" aria-hidden />{t('file.ai.running')}</p>}
        {analyze.isError && <Alert tone="danger">{t(`file.ai.errors.${problemOf(analyze.error)}`)}</Alert>}
      </div>
    </Can>
  );
}

/** A reading the AI made is marked as such, and the texts that are not in the file word for word are listed. */
export function AiNotes({ result }: { result: EvalFileResult }) {
  const { t } = useTranslation('performance');
  if (result.source !== 'ai') return null;
  return (
    <div className="flex flex-col gap-3">
      <div><Badge tone="warning">{t('file.ai.badge')}</Badge></div>
      {!!result.ungrounded?.length && <Alert tone="warning"><b>{t('file.ai.ungroundedTitle')}</b><ul className="mt-1 list-disc ps-5">{result.ungrounded.map((x) => <li key={x} dir="auto">{x}</li>)}</ul></Alert>}
    </div>
  );
}
