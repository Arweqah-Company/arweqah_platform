import { CorePermission, type CycleStage } from '@arweqah-platform/shared';
import { Check, Send } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Can } from '@/core/permissions/can';
import { Button, ConfirmDialog } from '@/shared/ui';
import { useApproveResults, useFinishCalibration } from './api';

type Ask = 'finish' | 'approve' | null;

/** The two buttons of the holder: «finish calibration and send it to approval» (calibration stage) and «approve the results and tell everyone» (approval stage); each is dim with its reason outside its stage and asks to be confirmed. */
export function CalibrationActions({ stage, waiting }: { stage: CycleStage | 'none'; waiting: number }) {
  const { t } = useTranslation('performance');
  const [ask, setAsk] = useState<Ask>(null);
  const finish = useFinishCalibration();
  const approve = useApproveResults();
  const run = ask === 'finish' ? finish : approve;
  const confirm = () => run.mutate(undefined as never, { onSuccess: () => { toast.success(t(`calibration.${ask}Done`)); setAsk(null); }, onError: () => setAsk(null) });
  return (
    <div className="flex flex-wrap gap-2">
      <Can permission={CorePermission.PerformanceCalibrate}>
        <Button variant="secondary" disabled={stage !== 'cal' || waiting > 0} title={stage !== 'cal' ? t('calibration.notCalibration') : waiting > 0 ? t('calibration.waitingCount', { count: waiting }) : undefined} onClick={() => setAsk('finish')}><Send className="size-4" aria-hidden />{t('calibration.finish')}</Button>
      </Can>
      <Can permission={CorePermission.PerformanceApprove}>
        <Button disabled={stage !== 'appr'} title={stage !== 'appr' ? t('calibration.notApproval') : undefined} onClick={() => setAsk('approve')}><Check className="size-4" aria-hidden />{t('calibration.approve')}</Button>
      </Can>
      {ask && <ConfirmDialog open onOpenChange={(o) => !o && setAsk(null)} title={t(`calibration.${ask}Title`)} description={t(`calibration.${ask}Body`)} confirmLabel={t(`calibration.${ask}`)} busy={run.isPending} onConfirm={confirm} />}
    </div>
  );
}
