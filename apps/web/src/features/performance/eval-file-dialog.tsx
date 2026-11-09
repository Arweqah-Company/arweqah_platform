import { EVAL_FILE_MAX, type EvalFileResult } from '@arweqah-platform/shared';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ApiError } from '@/core/api/api-client';
import { TITLE_FILE_ACCEPT, TITLE_FILE_MAX_BYTES } from '@/shared/lib/read-document';
import { useDocumentReader } from '@/shared/lib/use-document-reader';
import { Alert, Button, Dialog, DialogFooter, FileDropzone, FormField, Textarea } from '@/shared/ui';
import { readEvalFile, useConfirmEvalFile, useSaveEvalFile } from './api';
import { AiNotes, AiOffer } from './eval-file-ai';
import { Findings, isSound } from './eval-file-findings';

/** The server's check of a text: the result belongs to the text it was made for, so a check that finishes after the text changed is never used. */
function useEvalCheck(text: string) {
  const [checked, setChecked] = useState<{ text: string; result: EvalFileResult } | null>(null);
  const check = useMutation({ mutationFn: (value: string) => readEvalFile({ text: value, dryRun: true }), onSuccess: (r, value) => setChecked({ text: value, result: r }) });
  return { check, result: checked && checked.text === text ? checked.result : null, run: (value: string) => { setChecked(null); check.mutate(value); }, forget: () => setChecked(null), adopt: (result: EvalFileResult, sent: string) => setChecked({ text: sent, result }) };
}

/** What the check found, with the AI's marks when it made the reading. */
function ResultPart({ result }: { result: EvalFileResult }) {
  return (
    <>
      <AiNotes result={result} />
      <Findings result={result} />
    </>
  );
}

/** The buttons under the dialog: save (off, with the reason beside it, until a sound file was extracted) and close. */
function FileFooter({ saveable, saving, onSave, onClose }: { saveable: boolean; saving: boolean; onSave: () => void; onClose: () => void }) {
  const { t } = useTranslation('performance');
  return (
    <DialogFooter>
      {!saveable && <span className="me-auto self-center text-sm text-muted">{t('file.saveOff')}</span>}
      <Button disabled={!saveable || saving} onClick={onSave}>{t('file.save')}</Button>
      <Button variant="secondary" onClick={onClose}>{t('close')}</Button>
    </DialogFooter>
  );
}

/** The words for a refused or failed save, or null. */
const saveFailure = (t: (key: string) => string, error: unknown): string | null => (error instanceof ApiError ? t('file.saveRefused') : error ? t('file.saveFailed') : null);

/** The dialog that reads the evaluation file: pasted text, or a txt, Word or PDF file read in the browser; the server checks it and nothing is saved before «Save». */
export function EvalFileDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('performance');
  const [text, setText] = useState('');
  const [empty, setEmpty] = useState(false);
  const { check, result, run, forget, adopt } = useEvalCheck(text);
  const save = useSaveEvalFile();
  const confirm = useConfirmEvalFile();
  const reader = useDocumentReader((value) => { setText(value); setEmpty(false); run(value); });
  const failed = saveFailure(t, save.error ?? confirm.error);
  const extract = () => { setEmpty(!text.trim()); if (text.trim()) run(text); };
  const saveable = !!result && isSound(result);
  const finished = { onSuccess: () => { toast.success(t('file.saved', { count: result?.stages.length ?? 0 })); onClose(); } };
  const onSave = () => (result?.source === 'ai' && result.content ? confirm.mutate(result.content, finished) : save.mutate(text, finished));
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t('file.title')} description={t('file.description')} xl>
      <div className="flex flex-col gap-4">
        <FileDropzone label={t('file.pick')} accept={TITLE_FILE_ACCEPT} maxBytes={TITLE_FILE_MAX_BYTES} hint={t('file.hint')} busy={check.isPending} onFiles={(f) => void reader.read(f)} />
        {reader.failure && <Alert tone="danger">{t(`file.readErrors.${reader.failure}`)}</Alert>}
        <FormField label={t('file.paste')} hint={t('file.limit', { max: EVAL_FILE_MAX.toLocaleString() })}>{(p) => <Textarea {...p} rows={6} placeholder={t('file.pastePlaceholder')} value={text} maxLength={EVAL_FILE_MAX} onChange={(e) => { setText(e.target.value); setEmpty(false); forget(); }} />}</FormField>
        <div><Button disabled={check.isPending} onClick={extract}>{t('file.check')}</Button></div>
        <p role="alert" className="text-sm text-danger-text empty:hidden">{empty ? t('file.pasteFirst') : undefined}</p>
        <AiOffer text={text} onResult={(answer, sent) => sent === text && adopt(answer, sent)} />
        {check.isError && <Alert tone="danger">{t('file.checkFailed')}</Alert>}
        {result && <ResultPart result={result} />}
        {failed && <Alert tone="danger">{failed}</Alert>}
      </div>
      <FileFooter saveable={saveable} saving={save.isPending || confirm.isPending} onSave={onSave} onClose={onClose} />
    </Dialog>
  );
}
