import type { CycleStage } from '@arweqah-platform/shared';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogFooter, Button, GuardedButton } from '@/shared/ui';
import { stepState } from './cycle-stepper';
import { STAGE_TARGETS } from './stage-targets';

/** What happens in a stage: who works in it, what happens and when, and a way to the screen of the stage (a button that says why when that screen is not built yet). */
export function StageDialog({ step, stage, onClose }: { step: CycleStage; stage: CycleStage | 'none'; onClose: () => void }) {
  const { t } = useTranslation('performance');
  const navigate = useNavigate();
  const target = STAGE_TARGETS[step];
  const go = () => {
    onClose();
    if (target && target !== 'here') navigate(target);
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t(`stages.${step}.title`)} description={t(`stage.state.${stepState(step, stage)}`)}>
      <div className="flex flex-col gap-3">
        {(['who', 'what', 'date'] as const).map((k) => (
          <div key={k} className="flex flex-col gap-1 rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
            <span className="text-sm text-muted">{t(`stage.${k}`)}</span>
            <span className={k === 'what' ? 'text-fg' : 'font-bold text-fg'}>{t(`stages.${step}.${k}`)}</span>
          </div>
        ))}
      </div>
      <DialogFooter>
        <GuardedButton blocked={target === null} reason={t('stage.goSoon')} onClick={go}>{t('stage.go')}</GuardedButton>
        <Button variant="secondary" onClick={onClose}>{t('close')}</Button>
      </DialogFooter>
    </Dialog>
  );
}
