import { useTranslation } from 'react-i18next';
import { Badge, Dialog, DialogFooter, Button } from '@/shared/ui';
import { stepState, type Step } from './cycle-stepper';

/** What happens in a stage: who works in it, what happens and its usual date, and whether it is the current one, past or coming. */
export function StageDialog({ step, stage, onClose }: { step: Step; stage: Step; onClose: () => void }) {
  const { t } = useTranslation('performance');
  const state = stepState(step, stage);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t(`stages.${step}.title`)} description={t(`stage.state.${state}`)}>
      <dl className="grid gap-3 text-sm">
        {(['who', 'what', 'date'] as const).map((k) => (
          <div key={k}><dt className="text-xs text-muted">{t(`stage.${k}`)}</dt><dd className="font-medium text-fg">{t(`stages.${step}.${k}`)}</dd></div>
        ))}
      </dl>
      <Badge tone={state === 'current' ? 'info' : state === 'done' ? 'success' : 'neutral'}>{t(`stage.state.${state}`)}</Badge>
      <DialogFooter><Button variant="secondary" onClick={onClose}>{t('close')}</Button></DialogFooter>
    </Dialog>
  );
}
