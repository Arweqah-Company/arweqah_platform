import { CorePermission, type CycleStateDto } from '@arweqah-platform/shared';
import { ArrowRight, Lock, PlayCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Can } from '@/core/permissions/can';
import { Button, GuardedButton } from '@/shared/ui';

export type CycleDialog = 'open' | 'file' | 'close' | 'advance' | null;

/**
 * The buttons of the page header: close, then open (before a cycle runs) or move on (while it runs); each behind its own key. A button that cannot act now stays
 * in place, dimmed, and says why when pressed. In the last stage, the objections, «move on» is the closing.
 */
export function CycleActions({ state, onDialog }: { state: CycleStateDto; onDialog: (d: CycleDialog) => void }) {
  const { t } = useTranslation('performance');
  const stage = state.cycle?.stage ?? 'none';
  const running = stage !== 'none' && stage !== 'closed';
  return (
    <div className="flex flex-wrap gap-2">
      <Can permission={CorePermission.PerformanceCycleClose}>
        <GuardedButton variant="secondary" blocked={!running} reason={t(stage === 'none' ? 'actions.blocked.closeNotOpen' : 'actions.blocked.closed')} onClick={() => onDialog('close')}>
          <Lock className="size-4" aria-hidden />{t('actions.close')}
        </GuardedButton>
      </Can>
      <Can permission={CorePermission.PerformanceCycleManage}>
        {running ? (
          <Button variant="secondary" onClick={() => onDialog(stage === 'obj' ? 'close' : 'advance')}><ArrowRight className="size-4 rtl:rotate-180" aria-hidden />{t('actions.advance')}</Button>
        ) : (
          <GuardedButton variant="secondary" blocked={!state.readiness.ready} reason={t('page.notReady')} onClick={() => onDialog('open')}><PlayCircle className="size-4" aria-hidden />{t('actions.open')}</GuardedButton>
        )}
      </Can>
    </div>
  );
}
