import { REQUEST_LEVELS, REQUEST_PLAN_KINDS, REQUEST_STATUSES, type DevelopmentRequestDto, type RequestStatus } from '@arweqah-platform/shared';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import type { ExportColumn } from '@/shared/data-exchange/types';
import { Badge, DetailsDialog, type Column, type FilterField } from '@/shared/ui';

export const REQUEST_TONE: Record<RequestStatus, 'warning' | 'success' | 'danger'> = { pending: 'warning', approved: 'success', rejected: 'danger' };

const day = (iso: string | null): string | null => (iso ? new Date(iso).toLocaleDateString() : null);
const money = (t: TFunction<'career-profile'>, amount: number): string => t('requests.riyals', { amount: amount.toLocaleString('en') });

/** The columns of a list of requests and of its export; the employee column only where the list holds other people's requests. */
export function useRequestColumns(withEmployee: boolean): { columns: Column<DevelopmentRequestDto>[]; exportColumns: ExportColumn<DevelopmentRequestDto>[] } {
  const { t } = useTranslation('career-profile');
  const who = (x: DevelopmentRequestDto) => t(`requests.whoLevel.${x.level}`);
  const cost = (x: DevelopmentRequestDto) => <span className="inline-flex items-center gap-2"><span dir="ltr">{money(t, x.cost)}</span>{x.overBudget && <Badge tone="warning">{t('requests.over')}</Badge>}</span>;
  const employee: Column<DevelopmentRequestDto>[] = withEmployee ? [{ id: 'employee', header: t('requests.columns.employee'), cell: (x) => <span className="font-medium">{x.employeeName}</span> }] : [];
  const columns: Column<DevelopmentRequestDto>[] = [
    ...employee,
    { id: 'course', header: t('requests.columns.course'), cell: (x) => x.courseName },
    { id: 'cost', header: t('requests.columns.cost'), cell: cost },
    { id: 'plan', header: t('requests.columns.plan'), cell: (x) => t(`requests.planKind.${x.plan}`) },
    { id: 'level', header: t('requests.columns.level'), cell: (x) => <span>{who(x)}{x.approverName && <span className="block text-sm text-muted">{x.approverName}</span>}</span> },
    { id: 'status', header: t('requests.columns.status'), cell: (x) => <Badge tone={REQUEST_TONE[x.status]}>{t(`requests.status.${x.status}`)}</Badge> },
    { id: 'submitted', header: t('requests.columns.submitted'), cell: (x) => day(x.submittedAt) },
  ];
  const exportColumns: ExportColumn<DevelopmentRequestDto>[] = [
    ...(withEmployee ? [{ id: 'employee', header: t('requests.columns.employee'), value: (x: DevelopmentRequestDto) => x.employeeName }] : []),
    { id: 'course', header: t('requests.columns.course'), value: (x) => x.courseName }, { id: 'cost', header: t('requests.columns.cost'), value: (x) => x.cost },
    { id: 'plan', header: t('requests.columns.plan'), value: (x) => t(`requests.planKind.${x.plan}`) }, { id: 'level', header: t('requests.columns.level'), value: who },
    { id: 'status', header: t('requests.columns.status'), value: (x) => t(`requests.status.${x.status}`) }, { id: 'submitted', header: t('requests.columns.submitted'), value: (x) => day(x.submittedAt) },
  ];
  return { columns, exportColumns };
}

/** The filters of a list of requests: state and plan, and (for approvers) who decides. */
export function useRequestFilters(withLevel: boolean): FilterField[] {
  const { t } = useTranslation('career-profile');
  const level: FilterField[] = withLevel ? [{ id: 'level', label: t('requests.filters.level'), type: 'select', options: REQUEST_LEVELS.map((l) => ({ value: l, label: t(`requests.whoLevel.${l}`) })) }] : [];
  return [
    { id: 'status', label: t('requests.filters.status'), type: 'select', options: REQUEST_STATUSES.map((s) => ({ value: s, label: t(`requests.status.${s}`) })) },
    ...level,
    { id: 'plan', label: t('requests.filters.plan'), type: 'select', options: REQUEST_PLAN_KINDS.map((p) => ({ value: p, label: t(`requests.planKind.${p}`) })) },
  ];
}

/** The facts of a request, for a row with no page of its own. */
export function RequestDetails({ request, onClose }: { request: DevelopmentRequestDto; onClose: () => void }) {
  const { t } = useTranslation('career-profile');
  return (
    <DetailsDialog
      title={request.courseName}
      description={request.employeeName}
      onClose={onClose}
      rows={[
        [t('requests.columns.cost'), money(t, request.cost)], [t('requests.columns.plan'), t(`requests.planKind.${request.plan}`)], [t('requests.columns.level'), `${t(`requests.whoLevel.${request.level}`)}${request.approverName ? ` (${request.approverName})` : ''}`],
        [t('requests.columns.status'), t(`requests.status.${request.status}`)], [t('requests.columns.submitted'), day(request.submittedAt)], [t('requests.decidedAt'), day(request.decidedAt)],
        [t('requests.agreementFile'), request.hasAgreement ? (request.agreementName ?? '✓') : t('requests.noAgreement')], [t('requests.rejectedBecause'), request.status === 'rejected' ? request.rejectionReason : null],
      ]}
    />
  );
}
