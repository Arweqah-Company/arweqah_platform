import { DEFAULT_SCALE_BANDS, SCALE_LEVELS_MAX, SCALE_LEVELS_MIN, buildBands, scaleEditProblems, scaleInputSchema, type GradeBand } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { removeAt, replaceAt } from '@/shared/lib/array-edit';
import { Alert, Dialog, EditorBlock, EditorRow, FormField, Input, Textarea } from '@/shared/ui';
import { useSaveScale } from './api';
import { EditorFooter } from './editor-footer';
import { numberOf } from './stage-draft';

interface BandDraft {
  name: string;
  from: string;
  to: string;
  description: string;
}

const bandDraft = (b: { name: string; from: number | null; to: number | null; description: string }): BandDraft => ({ name: b.name, from: b.from === null ? '' : String(b.from), to: b.to === null ? '' : String(b.to), description: b.description });
/** The kept scale, or the five usual levels while none is kept. */
const draftOf = (bands: GradeBand[] | null): BandDraft[] => (bands?.length ? bands : DEFAULT_SCALE_BANDS).map(bandDraft);

/** What the form sends, or why not: the five bands highest first, the top one open above and the bottom one open below, none overlapping the next. */
function checkBands(draft: BandDraft[]): { input: ReturnType<typeof scaleInputSchema.parse> | null; ranges: boolean } {
  const last = draft.length - 1;
  const parsed = scaleInputSchema.safeParse({ bands: draft.map((b, i) => ({ name: b.name, from: i === last ? null : numberOf(b.from), to: i === 0 ? null : numberOf(b.to), description: b.description })) });
  if (!parsed.success) return { input: null, ranges: true };
  return { input: parsed.data, ranges: scaleEditProblems(parsed.data.bands).length === 0 };
}

/** What is wrong with the form, said once the person typed or pressed save: a field to fill, or ranges that overlap. */
function ScaleProblem({ show, complete, ranges }: { show: boolean; complete: boolean; ranges: boolean }) {
  const { t } = useTranslation('performance');
  if (!show || (complete && ranges)) return null;
  return <Alert tone="warning">{t(complete ? 'editor.scale.rangeProblem' : 'editor.complete')}</Alert>;
}

/** The grade scale: five levels, the highest first; each has its name, where it starts and ends and what it means. The ranges are checked as they are typed. */
export function ScaleEditorDialog({ bands, onClose }: { bands: GradeBand[] | null; onClose: () => void }) {
  const { t } = useTranslation('performance');
  const save = useSaveScale();
  const initial = draftOf(bands);
  const [draft, setDraft] = useState(initial);
  const [tried, setTried] = useState(false);
  const check = checkBands(draft);
  const last = draft.length - 1;
  const submit = () => {
    setTried(true);
    if (check.input && check.ranges) save.mutate({ bands: check.input.bands }, { onSuccess: () => { toast.success(t('editor.scale.saved')); onClose(); } });
  };
  const preview = check.input && check.ranges ? buildBands(check.input).map((b) => b.range).join(' · ') : null;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t('editor.scale.title')} description={t('editor.scale.description')} xl>
      <div className="flex flex-col gap-4">
        <EditorBlock title={t('editor.scale.levels')} hint={preview ?? t('editor.scale.hint')} onAdd={draft.length < SCALE_LEVELS_MAX ? () => setDraft([...draft, { name: '', from: '', to: '', description: '' }]) : undefined} addLabel={t('editor.scale.add')}>
          {draft.map((b, i) => (
            <EditorRow key={i} onRemove={draft.length > SCALE_LEVELS_MIN ? () => setDraft(removeAt(draft, i)) : undefined} removeLabel={t('editor.remove')}>
              <FormField label={`${t('editor.scale.name')} ${i + 1}`}>{(p) => <Input {...p} aria-required maxLength={80} value={b.name} onChange={(e) => setDraft(replaceAt(draft, i, { ...b, name: e.target.value }))} />}</FormField>
              {i < last && <FormField label={t('editor.scale.from')}>{(p) => <Input {...p} aria-required type="number" step="any" dir="ltr" value={b.from} onChange={(e) => setDraft(replaceAt(draft, i, { ...b, from: e.target.value }))} />}</FormField>}
              {i > 0 && <FormField label={t('editor.scale.to')}>{(p) => <Input {...p} aria-required type="number" step="any" dir="ltr" value={b.to} onChange={(e) => setDraft(replaceAt(draft, i, { ...b, to: e.target.value }))} />}</FormField>}
              <FormField label={t('editor.scale.meaning')}>{(p) => <Textarea {...p} rows={2} maxLength={400} value={b.description} onChange={(e) => setDraft(replaceAt(draft, i, { ...b, description: e.target.value }))} />}</FormField>
            </EditorRow>
          ))}
        </EditorBlock>
        <ScaleProblem show={tried || JSON.stringify(draft) !== JSON.stringify(initial)} complete={!!check.input} ranges={check.ranges} />
        {save.isError && <Alert tone="danger">{t('editor.saveFailed')}</Alert>}
      </div>
      <EditorFooter saving={save.isPending} onSave={submit} onCancel={onClose} />
    </Dialog>
  );
}
