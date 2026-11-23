import { CorePermission } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '@/core/permissions/can';
import { useNoticeHome } from '../api';

function Count({ value, label }: { value: number | null | undefined; label: string }) {
  if (!value) return null;
  return <span className="grid min-w-6 place-items-center rounded-full bg-yellow-300 px-2 text-xs font-bold text-ink" aria-label={label}>{value}</span>;
}

/** The yellow count after «My notices»: policies still waiting for my acknowledgement (nothing at zero). */
export function AwaitingBadge() {
  const { t } = useTranslation('notices');
  const allowed = usePermissions().can(CorePermission.NoticesView);
  const home = useNoticeHome(allowed).data;
  return <Count value={home?.awaiting} label={t('nav.awaitingBadge', { count: home?.awaiting ?? 0 })} />;
}

/** The count after «Waiting for my approval». */
export function ApprovalsBadge() {
  const { t } = useTranslation('notices');
  const allowed = usePermissions().can(CorePermission.NoticesView);
  const home = useNoticeHome(allowed).data;
  return <Count value={home?.pendingApproval} label={t('nav.approvalsBadge', { count: home?.pendingApproval ?? 0 })} />;
}
