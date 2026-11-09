import { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Alert, EmptyState, Tabs } from '@/shared/ui';
import { useMyEvaluation } from './api';
import { FiscalCardTab } from './fiscal-card';
import { GradeScale } from './grade-scale';
import { MyEvaluation } from './my-evaluation';
import { BehavioursTab, WeightsTab } from './stage-info';

const TABS = ['me', 'weights', 'behaviours', 'scale', 'calendar'] as const;
type Tab = (typeof TABS)[number];

/** The section «performance evaluation» of the career path: the weights and criteria of the employee's stage, the behaviours, the grade scale, the fiscal card, and «my evaluation». */
export function EvaluationSection() {
  const { t } = useTranslation('performance');
  const query = useMyEvaluation();
  const [tab, setTab] = useState<Tab>('me');
  const mine = query.data;
  if (query.isError) return <Alert tone="danger">{t('evaluation.loadFailed')}</Alert>;
  if (!mine) return null;
  if (!mine.cycle) return <Alert tone="info">{t('evaluation.noCycle')}</Alert>;
  const evaluation = mine.evaluation;
  if (!evaluation) return <EmptyState icon={ClipboardList} title={t('evaluation.none')} description={t('evaluation.noneHint')} />;
  return (
    <div className="flex flex-col gap-4">
      <Alert tone="info">{t('evaluation.yourStage')}: <b>{evaluation.stageName}</b>. {t('evaluation.yourStageHint')}</Alert>
      <Tabs tabs={TABS.map((id) => ({ id, label: t(`evaluation.tabs.${id}`) }))} value={tab} label={t('evaluation.tabsLabel')} onChange={setTab} />
      <div role="tabpanel" className="flex flex-col gap-3">
        {tab === 'me' && <MyEvaluation mine={mine} evaluation={evaluation} />}
        {tab === 'weights' && <WeightsTab template={evaluation.template} />}
        {tab === 'behaviours' && <BehavioursTab template={evaluation.template} />}
        {tab === 'scale' && <GradeScale bands={evaluation.scale} cap={evaluation.template.cap} />}
        {tab === 'calendar' && <FiscalCardTab card={evaluation.fiscal} />}
      </div>
    </div>
  );
}
