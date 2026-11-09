import type { StageTemplate } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Alert, Dialog } from '@/shared/ui';
import { useSaveStage } from './api';
import { EditorFooter } from './editor-footer';
import { BehavioursEditor, CriteriaEditor, ExtraEditor, StageBasics } from './stage-editor-parts';
import { blankStage, checkStage, stageDraftOf, type StageDraft } from './stage-draft';

/** What the form says is wrong: the fields to fill, or the checks the template fails (each in words), once the person typed or pressed save. */
function Problems({ check }: { check: ReturnType<typeof checkStage> }) {
  const { t } = useTranslation('performance');
  if (!check.input) return <Alert tone="warning">{t('editor.complete')}</Alert>;
  if (!check.problems.length) return null;
  return <Alert tone="warning"><ul className="list-disc ps-5">{check.problems.map((p) => <li key={p}>{t(`file.problems.${p}`)}</li>)}</ul></Alert>;
}

/** The template of one stage: the weights, the extra components, the criteria and the behaviours; the basic total and the cap follow from them, and what is wrong is said as it is typed. */
export function StageEditorDialog({ stage, template, onClose }: { stage: number; template: StageTemplate | null; onClose: () => void }) {
  const { t } = useTranslation('performance');
  const save = useSaveStage();
  const initial = template ? stageDraftOf(template) : blankStage(t(`readiness.names.${stage}`));
  const [draft, setDraft] = useState<StageDraft>(initial);
  const [tried, setTried] = useState(false);
  const check = checkStage(stage, draft);
  const changed = JSON.stringify(draft) !== JSON.stringify(initial);
  const submit = () => {
    setTried(true);
    if (check.input && !check.problems.length) save.mutate({ stage, ...check.input }, { onSuccess: () => { toast.success(t('editor.stage.saved')); onClose(); } });
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t('editor.stage.title', { stage, name: draft.name })} description={t('editor.stage.description')} xl>
      <div className="flex flex-col gap-4">
        <StageBasics draft={draft} onChange={setDraft} basic={check.basic} />
        <ExtraEditor draft={draft} onChange={setDraft} cap={check.cap} />
        <CriteriaEditor draft={draft} onChange={setDraft} shares={check.shares} />
        <BehavioursEditor draft={draft} onChange={setDraft} stage={stage} />
        {(tried || changed) && <Problems check={check} />}
        {save.isError && <Alert tone="danger">{t('editor.saveFailed')}</Alert>}
      </div>
      <EditorFooter saving={save.isPending} onSave={submit} onCancel={onClose} />
    </Dialog>
  );
}
