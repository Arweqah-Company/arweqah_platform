import { CorePermission, type CycleStateDto } from '@arweqah-platform/shared';
import { ArrowRight, FileUp, Lock, PlayCircle } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Can } from '@/core/permissions/can';
import { Alert, Button, ConfirmDialog, PageHeader } from '@/shared/ui';
import { useAdvanceCycle, useCloseCycle, useCycle } from './api';
import { CatalogTable } from './catalog-table';
import { CycleStepper, type Step } from './cycle-stepper';
import { DatesTable } from './dates-table';
import { EvalFileDialog } from './eval-file-dialog';
import { OpenDialog } from './open-dialog';
import { ReadinessCard } from './readiness-card';
import { StageDialog } from './stage-dialog';

type Dialogs = 'open' | 'file' | 'close' | 'advance' | null;

/** The buttons of the header: open, move on, close; each with its own key. */
function CycleActions({ state, onOpen }: { state: CycleStateDto; onOpen: (d: Dialogs) => void }) {
  const { t } = useTranslation('performance');
  const stage = state.cycle?.stage ?? 'none';
  const running = stage !== 'none' && stage !== 'closed';
  return (
    <div className="flex flex-wrap gap-2">
      <Can permission={CorePermission.PerformanceCycleManage}>
        {!running && <Button disabled={!state.readiness.ready} onClick={() => onOpen('open')}><PlayCircle className="size-4" aria-hidden />{t('actions.open')}</Button>}
        {running && stage !== 'obj' && <Button onClick={() => onOpen('advance')}><ArrowRight className="size-4 rtl:rotate-180" aria-hidden />{t('actions.advance')}</Button>}
      </Can>
      <Can permission={CorePermission.PerformanceCycleClose}>{running && <Button variant="danger" onClick={() => onOpen('close')}><Lock className="size-4" aria-hidden />{t('actions.close')}</Button>}</Can>
    </div>
  );
}

/** The confirmations of moving the cycle on and of closing it. */
function Confirmations({ dialog, onClose }: { dialog: Dialogs; onClose: () => void }) {
  const { t } = useTranslation('performance');
  const advance = useAdvanceCycle();
  const close = useCloseCycle();
  return (
    <>
      <ConfirmDialog open={dialog === 'advance'} onOpenChange={(o) => { if (!o) { advance.reset(); onClose(); } }} title={t('advance.title')} description={t('advance.description')} confirmLabel={t('actions.advance')} busy={advance.isPending} onConfirm={() => advance.mutate(undefined, { onSuccess: () => { toast.success(t('advance.done')); onClose(); } })}>
        {advance.isError && <Alert tone="danger">{t('actions.failed')}</Alert>}
      </ConfirmDialog>
      <ConfirmDialog open={dialog === 'close'} onOpenChange={(o) => { if (!o) { close.reset(); onClose(); } }} title={t('closeCycle.title')} description={t('closeCycle.description')} tone="danger" confirmLabel={t('actions.close')} busy={close.isPending} onConfirm={() => close.mutate(undefined, { onSuccess: () => { toast.success(t('closeCycle.done')); onClose(); } })}>
        {close.isError && <Alert tone="danger">{t('actions.failed')}</Alert>}
      </ConfirmDialog>
    </>
  );
}

/** The sections of the page once the state is loaded. */
function CycleBody({ state, onDialog }: { state: CycleStateDto; onDialog: (d: Dialogs) => void }) {
  const { t } = useTranslation('performance');
  const [step, setStep] = useState<Step | null>(null);
  const stage = state.cycle?.stage ?? 'none';
  const running = stage !== 'none' && stage !== 'closed';
  return (
    <>
      <CycleStepper stage={stage} onOpen={setStep} />
      {state.cycle && <p className="text-sm text-muted">{t('page.fiscalYear', { year: state.cycle.fiscalYear })}</p>}
      {!running && !state.readiness.ready && <Alert tone="warning">{t('page.notReady')}</Alert>}
      <div className="flex flex-col gap-3">
        <ReadinessCard readiness={state.readiness} />
        <Can permission={CorePermission.PerformanceTemplateUpload}><div><Button variant="secondary" onClick={() => onDialog('file')}><FileUp className="size-4" aria-hidden />{t('actions.file')}</Button></div></Can>
      </div>
      <DatesTable dates={state.cycle?.dates ?? []} editable={running} />
      <CatalogTable items={state.catalog} />
      {step && <StageDialog step={step} stage={stage} onClose={() => setStep(null)} />}
    </>
  );
}

/** «Evaluation cycle» (HR): the stepper, the readiness list with the evaluation file, the dates of the stages and the catalog of the extra component. */
export function CyclePage() {
  const { t } = useTranslation('performance');
  const query = useCycle();
  const [dialog, setDialog] = useState<Dialogs>(null);
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t('page.title')} description={t('page.description')} actions={query.data ? <CycleActions state={query.data} onOpen={setDialog} /> : undefined} />
      {query.isError && <Alert tone="danger">{t('page.loadFailed')}</Alert>}
      {query.data && <CycleBody state={query.data} onDialog={setDialog} />}
      {dialog === 'open' && <OpenDialog onClose={() => setDialog(null)} />}
      {dialog === 'file' && <EvalFileDialog onClose={() => setDialog(null)} />}
      <Confirmations dialog={dialog} onClose={() => setDialog(null)} />
    </div>
  );
}
