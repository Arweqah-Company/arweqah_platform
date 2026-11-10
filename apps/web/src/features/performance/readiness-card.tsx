import { PERFORMANCE_STAGES, type ReadinessDto } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/shared/ui';
import { CycleCard } from './cycle-card';

function Item({ label, ok, text }: { label: string; ok: boolean; text: string }) {
  return <li>{label}: <Badge tone={ok ? 'success' : 'warning'}>{text}</Badge></li>;
}

/** What must be there before the cycle opens: the five stage evaluations, the grade scale and the fiscal-year card (each uploaded or not), the catalog, and a warning (not a stop) when nobody holds the calibration or the approval key. The evaluation file itself is the list under it. */
export function ReadinessCard({ readiness, holders }: { readiness: ReadinessDto; holders: { calibrate: number; approve: number } }) {
  const { t } = useTranslation('performance');
  const uploaded = (ok: boolean) => t(ok ? 'readiness.yes' : 'readiness.no');
  const stageName = (stage: number) => t(`readiness.names.${stage}`);
  return (
    <CycleCard
      title={t('readiness.title')}
      tour="performance-readiness"
      note={t('readiness.snapshot')}
    >
      <ul className="flex list-disc flex-col gap-1.5 ps-5 text-sm text-fg">
        {PERFORMANCE_STAGES.map((stage) => <Item key={stage} label={t('readiness.stage', { stage, name: stageName(stage) })} ok={!!readiness.stages.find((s) => s.stage === stage)?.ready} text={uploaded(!!readiness.stages.find((s) => s.stage === stage)?.ready)} />)}
        <Item label={t('readiness.scale')} ok={readiness.scale} text={uploaded(readiness.scale)} />
        <Item label={t('readiness.fiscal')} ok={readiness.fiscal} text={uploaded(readiness.fiscal)} />
        <Item label={t('readiness.catalog')} ok={readiness.catalogItems > 0} text={t('readiness.count', { count: readiness.catalogItems })} />
        <Item label={t('readiness.calibrate')} ok={holders.calibrate > 0} text={t('readiness.holders', { count: holders.calibrate })} />
        <Item label={t('readiness.approve')} ok={holders.approve > 0} text={t('readiness.holders', { count: holders.approve })} />
      </ul>
    </CycleCard>
  );
}
