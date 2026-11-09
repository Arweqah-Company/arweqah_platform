import { type CycleStage, type CycleStateDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Alert, ConfirmDialog, PageHeader } from '@/shared/ui';
import { useAdvanceCycle, useCloseCycle, useCycle, useTemplates } from './api';
import { CatalogTable } from './catalog-table';
import { CycleActions, type CycleDialog } from './cycle-actions';
import { CycleStepper } from './cycle-stepper';
import { DatesCard } from './dates-card';
import { EvalFileDialog } from './eval-file-dialog';
import { OpenDialog } from './open-dialog';
import { ReadinessCard } from './readiness-card';
import { RemindersList } from './reminders-list';
import { StageDialog } from './stage-dialog';
import { TemplatesList } from './templates-list';

/** The confirmations of moving the cycle on and of closing it for good. */
function Confirmations({ dialog, onClose }: { dialog: CycleDialog; onClose: () => void }) {
  const { t } = useTranslation('performance');
  const advance = useAdvanceCycle();
  const close = useCloseCycle();
  return (
    <>
      <ConfirmDialog open={dialog === 'advance'} onOpenChange={(o) => { if (!o) { advance.reset(); onClose(); } }} title={t('advance.title')} description={t('advance.description')} confirmLabel={t('actions.advance')} busy={advance.isPending} onConfirm={() => advance.mutate(undefined, { onSuccess: () => { toast.success(t('advance.done')); onClose(); } })}>
        {advance.isError && <Alert tone="danger">{t('actions.failed')}</Alert>}
      </ConfirmDialog>
      <ConfirmDialog open={dialog === 'close'} onOpenChange={(o) => { if (!o) { close.reset(); onClose(); } }} title={t('closeCycle.title')} description={t('closeCycle.description')} tone="danger" busy={close.isPending} onConfirm={() => close.mutate(undefined, { onSuccess: () => { toast.success(t('closeCycle.done')); onClose(); } })}>
        {close.isError && <Alert tone="danger">{t('actions.failed')}</Alert>}
      </ConfirmDialog>
    </>
  );
}

/** The cards of the page once the state is loaded: the stepper, the dates beside the readiness list, the reminders and the catalog. */
function CycleBody({ state, onDialog }: { state: CycleStateDto; onDialog: (d: CycleDialog) => void }) {
  const { t } = useTranslation('performance');
  const [step, setStep] = useState<CycleStage | null>(null);
  const stage = state.cycle?.stage ?? 'none';
  const templates = useTemplates();
  return (
    <>
      <CycleStepper stage={stage} onOpen={setStep} />
      {state.cycle && <p className="text-sm text-muted">{t('page.fiscalYear', { year: state.cycle.fiscalYear })}</p>}
      <div className="grid items-start gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        <DatesCard dates={state.dates} />
        <ReadinessCard readiness={state.readiness} />
      </div>
      {templates.data && <TemplatesList templates={templates.data} onUpload={() => onDialog('file')} />}
      <RemindersList reminders={state.reminders} />
      <CatalogTable items={state.catalog} caps={state.catalogCaps} />
      {step && <StageDialog step={step} stage={stage} onClose={() => setStep(null)} />}
    </>
  );
}

/** «Evaluation cycle» (HR), as the concept draws it: the header actions, the stepper, the dates and the readiness list, the reminders and the catalog of the extra component. */
export function CyclePage() {
  const { t } = useTranslation('performance');
  const query = useCycle();
  const [dialog, setDialog] = useState<CycleDialog>(null);
  const close = () => setDialog(null);
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t('page.title')} description={t('page.description')} actions={query.data ? <CycleActions state={query.data} onDialog={setDialog} /> : undefined} />
      {query.isError && <Alert tone="danger">{t('page.loadFailed')}</Alert>}
      {query.data && <CycleBody state={query.data} onDialog={setDialog} />}
      {dialog === 'open' && query.data && <OpenDialog initialYear={query.data.nextFiscalYear} onClose={close} />}
      {dialog === 'file' && <EvalFileDialog onClose={close} />}
      <Confirmations dialog={dialog} onClose={close} />
    </div>
  );
}
