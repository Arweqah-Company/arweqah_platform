import type { TicketListItemDto, TicketStatus } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/shared/ui';

const STATUS_TONE = { open: 'neutral', close_requested: 'info', closed: 'success' } as const;

export function TicketStatusBadge({ status, closeReason }: { status: TicketStatus; closeReason: TicketListItemDto['closeReason'] }) {
  const { t } = useTranslation('tickets');
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <Badge tone={STATUS_TONE[status]}>{t(`status.${status}`)}</Badge>
      {closeReason && <span className="text-xs text-muted">{t(`closeReason.${closeReason}`)}</span>}
    </span>
  );
}

/** Urgent, overdue, stale, new and personal marks of a ticket, each with words (never colour alone). */
export function TicketFlags({ ticket }: { ticket: Pick<TicketListItemDto, 'priority' | 'overdue' | 'stale' | 'isNew' | 'isPersonal'> }) {
  const { t } = useTranslation('tickets');
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {ticket.priority === 1 && <Badge tone="danger">{t('flags.urgent')}</Badge>}
      {ticket.overdue && <Badge tone="danger">{t('flags.overdue')}</Badge>}
      {ticket.stale && <Badge tone="warning">{t('flags.stale')}</Badge>}
      {ticket.isNew && <Badge tone="success">{t('flags.new')}</Badge>}
      {ticket.isPersonal && <Badge>{t('flags.personal')}</Badge>}
    </span>
  );
}
