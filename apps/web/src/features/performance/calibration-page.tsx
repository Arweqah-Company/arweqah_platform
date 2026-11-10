import type { CycleStage } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader, Tabs } from '@/shared/ui';
import { CalibrationActions } from './calibration-actions';
import { CalibrationList, useCalibrationList } from './calibration-list';
import { CycleStepper } from './cycle-stepper';
import { ObjectionList } from './objection-list';
import { StageDialog } from './stage-dialog';

const TABS = ['calibration', 'approval'] as const;
type Tab = (typeof TABS)[number];

/** «Calibration and approval»: the stepper, the holder's buttons, the calibration list with its distribution, and (second tab) the objections. */
export function CalibrationPage() {
  const { t } = useTranslation('performance');
  const [tab, setTab] = useState<Tab>('calibration');
  const data = useCalibrationList();
  const [step, setStep] = useState<CycleStage | null>(null);
  const stage = data.page?.cycle?.stage ?? 'none';
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t('calibration.title')} description={t('calibration.description')} actions={<CalibrationActions stage={stage} waiting={data.page?.waitingCount ?? 0} />} />
      <CycleStepper stage={stage} onOpen={setStep} />
      <Tabs tabs={TABS.map((id) => ({ id, label: t(`calibration.tabs.${id}`) }))} value={tab} label={t('calibration.tabsLabel')} onChange={setTab} />
      {tab === 'approval' ? <ObjectionList /> : <CalibrationList data={data} />}
      {step && <StageDialog step={step} stage={stage} onClose={() => setStep(null)} />}
    </div>
  );
}
