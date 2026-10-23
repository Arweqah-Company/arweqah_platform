import { TICKET_GROUPINGS, TICKET_STATUSES, type TicketFilterOptionsDto, type TicketGrouping, type TicketListItemDto, type TicketsQuery } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import type { FilterValues } from '@/shared/lib/use-filters';
import type { FilterField } from '@/shared/ui';

/** Department, type, assignee and status; the types offered follow the chosen department. */
export function useTicketFilterFields(options: TicketFilterOptionsDto | undefined, values: FilterValues): FilterField[] {
  const { t, i18n } = useTranslation('tickets');
  const ar = i18n.language === 'ar';
  const types = (options?.types ?? []).filter((x) => !values.deskId || x.deskId === values.deskId);
  return [
    { id: 'deskId', label: t('filters.desk'), type: 'select', options: (options?.desks ?? []).map((d) => ({ value: d.id, label: ar ? d.nameAr : d.nameEn })) },
    { id: 'typeId', label: t('filters.type'), type: 'select', options: types.map((x) => ({ value: x.id, label: ar ? x.nameAr : x.nameEn })) },
    { id: 'assigneeId', label: t('filters.assignee'), type: 'select', options: (options?.assignees ?? []).map((a) => ({ value: a.id, label: a.name })) },
    { id: 'status', label: t('filters.status'), type: 'select', options: TICKET_STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) })) },
  ];
}

export const GROUPINGS = TICKET_GROUPINGS;

/** The heading a ticket belongs to when the list is grouped. */
export function groupLabel(ticket: TicketListItemDto, groupBy: TicketGrouping, t: (key: string) => string, ar: boolean): string {
  switch (groupBy) {
    case 'assignee':
      return ticket.assignee?.name ?? t('groups.unassigned');
    case 'status':
      return t(`status.${ticket.status}`);
    case 'desk':
      return ar ? ticket.deskNameAr : ticket.deskNameEn;
    case 'type':
      return ar ? ticket.typeNameAr : ticket.typeNameEn;
  }
}

export function toTicketsQuery(values: FilterValues): Partial<TicketsQuery> {
  const text = (id: string) => values[id] || undefined;
  return { deskId: text('deskId'), typeId: text('typeId'), assigneeId: text('assigneeId'), status: text('status') as TicketsQuery['status'] };
}
