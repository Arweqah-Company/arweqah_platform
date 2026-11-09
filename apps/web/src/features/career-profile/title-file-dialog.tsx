import type { TitleFileResultDto } from '@arweqah-platform/shared';
import { TITLE_FILE_MAX_CHARS } from '@arweqah-platform/shared';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Badge, Button, Dialog, DialogFooter, FileDropzone, FormField, Textarea } from '@/shared/ui';
import { readTitleFile } from './api';
import { DocumentReadError, readDocumentText, TITLE_FILE_ACCEPT, TITLE_FILE_MAX_BYTES } from './read-document';
import { AiNotes, AiOffer } from './title-file-ai';
import { useTitleFileSave } from './use-title-file-save';

/** What the reader found: the counts of each part and what is still wrong, each in words. */
function Findings({ result, titleCode }: { result: TitleFileResultDto; titleCode: string | null }) {
  const { t } = useTranslation('career-profile');
  const counts = Object.entries(result.counts);
  return (
    <div className="flex flex-col gap-3" aria-live="polite">
      <div className="flex flex-wrap gap-2">{counts.map(([key, n]) => <Badge key={key} tone={n > 0 ? 'info' : 'neutral'}>{t(`file.counts.${key}`)}: {n}</Badge>)}</div>
      {result.problems.length === 0 ? (
        <Alert tone="success">{t('file.clean')}</Alert>
      ) : (
        <Alert tone="warning">
          <b>{t('file.needsReview')}</b>
          <ul className="mt-1 list-disc ps-5">{result.problems.map((p) => <li key={p}>{t(`file.problems.${p}`)}{p === 'code_mismatch' && <> <bdi dir="ltr" className="font-latin">({result.codeInFile ?? '—'} ≠ {titleCode ?? '—'})</bdi></>}</li>)}</ul>
        </Alert>
      )}
      <AiNotes result={result} />
      {result.ignored.length > 0 && <Alert tone="info">{t('file.ignored', { lines: result.ignored.join(' • ') })}</Alert>}
    </div>
  );
}

/** Saving needs a reading with nothing left to fix. */
const canSave = (result: TitleFileResultDto | null): boolean => !!result && result.problems.length === 0;

/** The AI is offered after the ordinary reading found something to fix and an AI service is on (its own reading is not offered again). */
const offersAi = (result: TitleFileResultDto | null): boolean => result?.source === 'rules' && result.aiAvailable;

/** Why «Save» is off, in words, so a disabled button is never a mystery. */
function SaveOff({ result }: { result: TitleFileResultDto | null }) {
  const { t } = useTranslation('career-profile');
  if (canSave(result)) return null;
  return <p className="me-auto text-sm text-muted">{t(result ? 'file.saveOff.problems' : 'file.saveOff.noReading')}</p>;
}

/** The text of the file (pasted or read from a document), what the ordinary reader found in it, and the way to read it again. */
function useTitleFileReading(titleId: string) {
  const { t } = useTranslation('career-profile');
  const [text, setText] = useState('');
  const [result, setResult] = useState<TitleFileResultDto | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const check = useMutation({ mutationFn: (value: string) => readTitleFile(titleId, { text: value, dryRun: true }), onSuccess: setResult });
  const run = (value: string) => { setResult(null); check.mutate(value); };
  const onFile = async (files: File[]) => {
    setReadError(null);
    try {
      const value = await readDocumentText(files[0] as File);
      setText(value);
      run(value);
    } catch (e) {
      setReadError(t(`file.readErrors.${e instanceof DocumentReadError ? e.reason : 'unreadable'}`));
    }
  };
  return { text, setText, result, setResult, readError, check, run, onFile };
}

/** The dialog that reads a title file: pasted text, or a txt, Word or PDF file read in the browser; nothing is saved before «Save». */
export function TitleFileDialog({ titleId, titleName, titleCode = null, onClose }: { titleId: string; titleName: string; titleCode?: string | null; onClose: () => void }) {
  const { t } = useTranslation('career-profile');
  const { text, setText, result, setResult, readError, check, run, onFile } = useTitleFileReading(titleId);
  const save = useTitleFileSave(titleId, text, result, onClose);
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()} title={t('file.title', { name: titleName })} description={t('file.description')} xl>
      <div className="flex flex-col gap-4">
        <FileDropzone label={t('file.pick')} accept={TITLE_FILE_ACCEPT} maxBytes={TITLE_FILE_MAX_BYTES} hint={t('file.hint')} busy={check.isPending} onFiles={(f) => void onFile(f)} />
        {readError && <Alert tone="danger">{readError}</Alert>}
        <FormField label={t('file.paste')} hint={t('file.limit', { max: TITLE_FILE_MAX_CHARS.toLocaleString() })}>
          {(props) => <Textarea {...props} rows={6} value={text} maxLength={TITLE_FILE_MAX_CHARS} onChange={(e) => { setText(e.target.value); setResult(null); }} />}
        </FormField>
        <div><Button variant="secondary" disabled={!text.trim() || check.isPending} onClick={() => run(text)}>{t('file.extract')}</Button></div>
        {check.isError && <Alert tone="danger">{t('file.extractFailed')}</Alert>}
        {result && <Findings result={result} titleCode={titleCode} />}
        {offersAi(result) && <AiOffer titleId={titleId} text={text} onResult={setResult} />}
        {save.failed && <Alert tone="danger">{save.failed}</Alert>}
      </div>
      <DialogFooter>
        <SaveOff result={result} />
        <Button disabled={!canSave(result) || save.pending} onClick={save.submit}>{t('file.save')}</Button>
        <Button variant="secondary" onClick={onClose}>{t('file.close')}</Button>
      </DialogFooter>
    </Dialog>
  );
}
