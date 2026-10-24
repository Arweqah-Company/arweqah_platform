import type { TaskPersonDto } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/shared/ui';

/** Before saving a task for oneself: who has to approve it (the direct manager), or that nobody does. */
export function ApproverHint({ forMyself, approver }: { forMyself: boolean; approver: TaskPersonDto | null }) {
  const { t } = useTranslation('tasks');
  if (!forMyself) return null;
  return <Alert tone="info">{approver ? t('form.approvedBy', { name: approver.name }) : t('form.noApproval')}</Alert>;
}
