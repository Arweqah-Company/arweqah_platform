import type { TemplateKind } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Can } from '@/core/permissions/can';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert } from '@/shared/ui';
import { useRequireApproval } from './api';
import { KIND_KEYS } from './keys';

/** The setting «a second person must approve changes», for who may change it, and a notice for everyone while it is on. */
export function ApprovalSwitch({ kind, requireApproval, loading }: { kind: TemplateKind; requireApproval: boolean; loading: boolean }) {
  const { t } = useTranslation('templates');
  const { t: tc } = useTranslation();
  const approval = useRequireApproval(kind);
  const change = async (value: boolean) => {
    try {
      await approval.mutateAsync(value);
      toast.success(value ? t('approval.on') : t('approval.off'));
    } catch (error) {
      toast.error(errorMessage(tc, error));
    }
  };
  return (
    <>
      <Can permission={KIND_KEYS[kind].settings}>
        <label className="mb-4 flex items-start gap-3 rounded-2xl border border-neutral-200 bg-white p-4 text-sm">
          <input type="checkbox" className="mt-1 size-4 accent-petrol-800" checked={requireApproval} disabled={loading || approval.isPending} onChange={(e) => void change(e.target.checked)} />
          <span><span className="block font-medium">{t('approval.label')}</span><span className="text-muted">{t('approval.hint')}</span></span>
        </label>
      </Can>
      {requireApproval && <div className="mb-4"><Alert tone="info">{t('approval.active')}</Alert></div>}
    </>
  );
}
