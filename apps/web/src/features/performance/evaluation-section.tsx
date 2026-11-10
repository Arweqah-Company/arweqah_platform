import type { MyEvaluationDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Alert, EmptyState, Tabs } from '@/shared/ui';
import { useMyEvaluation } from './api';
import { FiscalCardTab } from './fiscal-card';
import { GradeScale } from './grade-scale';
import { MyEvaluation } from './my-evaluation';
import { MyMilestones } from './my-milestones';
import { MyResult } from './my-result';
import { BehavioursTab, WeightsTab } from './stage-info';

const TABS = ['result', 'me', 'weights', 'behaviours', 'scale', 'calendar', 'milestones'] as const;
type Tab = (typeof TABS)[number];

/** The panel of the selected tab. */
function Panel({ tab, mine, evaluation }: { tab: Tab; mine: MyEvaluationDto; evaluation: NonNullable<MyEvaluationDto['evaluation']> }) {
  if (tab === 'result') return mine.result ? <MyResult result={mine.result} /> : null;
  if (tab === 'me') return <MyEvaluation mine={mine} evaluation={evaluation} />;
  if (tab === 'weights') return <WeightsTab template={evaluation.template} />;
  if (tab === 'behaviours') return <BehavioursTab template={evaluation.template} />;
  if (tab === 'milestones') return <MyMilestones />;
  return tab === 'scale' ? <GradeScale bands={evaluation.scale} cap={evaluation.template.cap} /> : <FiscalCardTab card={evaluation.fiscal} />;
}

/** The section «performance evaluation» of the career path: «my result» once I was told it, my evaluation, the weights and criteria of my stage, the behaviours, the grade scale and the fiscal card. */
export function EvaluationSection() {
  const { t } = useTranslation('performance');
  const query = useMyEvaluation();
  const [picked, setPicked] = useState<Tab | null>(null);
  const mine = query.data;
  if (query.isError) return <Alert tone="danger">{t('evaluation.loadFailed')}</Alert>;
  if (!mine) return null;
  if (!mine.cycle) return <Alert tone="info">{t('evaluation.noCycle')}</Alert>;
  const evaluation = mine.evaluation;
  if (!evaluation) return <EmptyState icon={ClipboardList} title={t('evaluation.none')} description={t('evaluation.noneHint')} />;
  const tab: Tab = picked ?? (mine.result ? 'result' : 'me');
  return (
    <div className="flex flex-col gap-4">
      <Alert tone="info">{t('evaluation.yourStage')}: <b>{evaluation.stageName}</b>. {t('evaluation.yourStageHint')}</Alert>
      <Tabs tabs={TABS.filter((id) => id !== 'result' || mine.result).map((id) => ({ id, label: t(`evaluation.tabs.${id}`) }))} value={tab} label={t('evaluation.tabsLabel')} onChange={setPicked} />
      <div role="tabpanel" className="flex flex-col gap-3"><Panel tab={tab} mine={mine} evaluation={evaluation} /></div>
    </div>
  );
}
