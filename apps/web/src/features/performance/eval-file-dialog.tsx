import { EVAL_FILE_MAX, type EvalFileResult } from '@arweqah-platform/shared';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ApiError } from '@/core/api/api-client';
import { TITLE_FILE_ACCEPT, TITLE_FILE_MAX_BYTES } from '@/shared/lib/read-document';
import { useDocumentReader } from '@/shared/lib/use-document-reader';
import { Alert, Badge, Button, Dialog, DialogFooter, FileDropzone, FormField, Textarea } from '@/shared/ui';
import { readEvalFile, useSaveEvalFile } from './api';

/** What the file holds, part by part: each stage with the checks it failed, the grade scale and the fiscal card. */
function Findings({ result }: { result: EvalFileResult }) {
  const { t } = useTranslation('performance');
  const parts = [
    ...result.stages.map((s) => ({ key: `s${s.stage}`, label: t('file.stage', { stage: s.stage, name: s.name }), problems: s.problems })),
    ...(result.scale ? [{ key: 'scale', label: t('file.scale', { count: result.scale.bands.length }), problems: result.scale.problems }] : []),
    ...(result.fiscal ? [{ key: 'fiscal', label: t('file.fiscal', { count: result.fiscal.card.months.length }), problems: result.fiscal.problems }] : []),
  ];
  if (!parts.length) return <Alert tone="warning">{t('file.empty')}</Alert>;
  return (
    <ul className="flex flex-col gap-2" aria-live="polite">
      {parts.map((p) => (
        <li key={p.key} className="rounded-2xl border border-neutral-200 bg-white p-3">
          <div className="flex flex-wrap items-center gap-2"><b className="text-fg">{p.label}</b><Badge tone={p.problems.length ? 'warning' : 'success'}>{t(p.problems.length ? 'file.needsReview' : 'file.sound')}</Badge></div>
          {p.problems.length > 0 && <ul className="mt-1 list-disc ps-5 text-sm text-fg">{p.problems.map((x) => <li key={x}>{t(`file.problems.${x}`)}</li>)}</ul>}
        </li>
      ))}
    </ul>
  );
}

const sound = (r: EvalFileResult): boolean => r.stages.length + (r.scale ? 1 : 0) + (r.fiscal ? 1 : 0) > 0 && r.stages.every((s) => !s.problems.length) && !r.scale?.problems.length && !r.fiscal?.problems.length;

/** The server's check of a text: the result belongs to the text it was made for, so a check that finishes after the text changed is never used. */
function useEvalCheck(text: string) {
  const [checked, setChecked] = useState<{ text: string; result: EvalFileResult } | null>(null);
  const check = useMutation({ mutationFn: (value: string) => readEvalFile({ text: value, dryRun: true }), onSuccess: (r, value) => setChecked({ text: value, result: r }) });
  return { check, result: checked && checked.text === text ? checked.result : null, run: (value: string) => { setChecked(null); check.mutate(value); }, forget: () => setChecked(null) };
}

/** The dialog that reads the evaluation file: pasted text, or a txt, Word or PDF file read in the browser; the server checks it and nothing is saved before «Save». */
export function EvalFileDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('performance');
  const [text, setText] = useState('');
  const { check, result, run, forget } = useEvalCheck(text);
  const save = useSaveEvalFile();
  const reader = useDocumentReader((value) => { setText(value); run(value); });
  const failed = save.error instanceof ApiError ? t('file.saveRefused') : save.isError ? t('file.saveFailed') : null;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t('file.title')} description={t('file.description')} xl>
      <div className="flex flex-col gap-4">
        <FileDropzone label={t('file.pick')} accept={TITLE_FILE_ACCEPT} maxBytes={TITLE_FILE_MAX_BYTES} hint={t('file.hint')} busy={check.isPending} onFiles={(f) => void reader.read(f)} />
        {reader.failure && <Alert tone="danger">{t(`file.readErrors.${reader.failure}`)}</Alert>}
        <FormField label={t('file.paste')} hint={t('file.limit', { max: EVAL_FILE_MAX.toLocaleString() })}>{(p) => <Textarea {...p} rows={6} value={text} maxLength={EVAL_FILE_MAX} onChange={(e) => { setText(e.target.value); forget(); }} />}</FormField>
        <div><Button variant="secondary" disabled={!text.trim() || check.isPending} onClick={() => run(text)}>{t('file.check')}</Button></div>
        {check.isError && <Alert tone="danger">{t('file.checkFailed')}</Alert>}
        {result && <Findings result={result} />}
        {failed && <Alert tone="danger">{failed}</Alert>}
      </div>
      <DialogFooter>
        <Button disabled={!result || !sound(result) || save.isPending} onClick={() => save.mutate(text, { onSuccess: () => { toast.success(t('file.saved')); onClose(); } })}>{t('file.save')}</Button>
        <Button variant="secondary" onClick={onClose}>{t('close')}</Button>
      </DialogFooter>
    </Dialog>
  );
}
