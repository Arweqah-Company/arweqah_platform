import type { TaskFlagsDto, TaskPriority, TaskStatus } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/shared/ui';

const STATUS_TONE = { pending_approval: 'info', todo: 'neutral', in_progress: 'info', awaiting_review: 'warning', done: 'success', rejected: 'danger' } as const;
const PRIORITY_TONE = { low: 'neutral', medium: 'neutral', high: 'warning' } as const;

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const { t } = useTranslation('tasks');
  return <Badge tone={STATUS_TONE[status]}>{t(`status.${status}`)}</Badge>;
}

export function TaskPriorityBadge({ priority }: { priority: TaskPriority }) {
  const { t } = useTranslation('tasks');
  return <Badge tone={PRIORITY_TONE[priority]}>{t(`priority.${priority}`)}</Badge>;
}

/** Urgent (red), overdue (red), stale (grey) and objected-to (yellow), each with words so colour never carries the meaning alone. */
export function TaskFlags({ flags }: { flags: TaskFlagsDto }) {
  const { t } = useTranslation('tasks');
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {flags.urgent && <Badge tone="danger">{t('flags.urgent')}</Badge>}
      {flags.overdue && <Badge tone="danger">{t('flags.overdue')}</Badge>}
      {flags.stale && <Badge>{t('flags.stale')}</Badge>}
      {flags.objected && <Badge tone="warning">{t('flags.objected')}</Badge>}
    </span>
  );
}
