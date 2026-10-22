import type { EmployeeListItemDto } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { ExportColumn } from '@/shared/data-exchange/types';
import { Badge, type Column } from '@/shared/ui';

/** The columns of the employee list, and the same data as plain text for export. */
export function useEmployeeColumns() {
  const { t, i18n } = useTranslation('employees');
  const { t: tc } = useTranslation();
  const ar = i18n.language === 'ar';
  const unit = (e: EmployeeListItemDto) => (e.orgNode ? (ar ? e.orgNode.pathAr : e.orgNode.pathEn) : null);
  const title = (e: EmployeeListItemDto) => (e.jobTitle ? (ar ? e.jobTitle.nameAr : e.jobTitle.nameEn) : null);
  const dash = <span className="text-muted">—</span>;
  const flags = (e: EmployeeListItemDto) => [e.needsPlacement && t('flags.needsPlacement'), e.idExpiresSoon && t('flags.idExpiring'), e.contractEndsSoon && t('flags.contractEnding')].filter(Boolean).join(' · ');

  const columns: Column<EmployeeListItemDto>[] = [
    { id: 'number', header: t('fields.employeeNumber'), cell: (e) => <span dir="ltr">{e.employeeNumber}</span> },
    { id: 'name', header: t('fields.fullName'), cell: (e) => <Link className="font-medium text-link underline-offset-4 hover:underline" to={`/employees/${e.id}`}>{e.fullName}</Link> },
    { id: 'company', header: t('fields.companyId'), cell: (e) => (ar ? e.company.nameAr : e.company.nameEn) },
    { id: 'unit', header: t('fields.orgNodeId'), cell: (e) => unit(e) ?? dash },
    { id: 'title', header: t('fields.jobTitleId'), cell: (e) => title(e) ?? dash },
    {
      id: 'status',
      header: t('statusLabel'),
      cell: (e) => (
        <span className="flex flex-wrap gap-1">
          <Badge tone={e.isActive ? 'success' : 'neutral'}>{tc(e.isActive ? 'status.active' : 'status.inactive')}</Badge>
          {e.needsPlacement && <Badge tone="highlight">{t('flags.needsPlacement')}</Badge>}
          {e.idExpiresSoon && <Badge tone="danger">{t('flags.idExpiring')}</Badge>}
          {e.contractEndsSoon && <Badge tone="highlight">{t('flags.contractEnding')}</Badge>}
        </span>
      ),
    },
  ];

  const exportColumns: ExportColumn<EmployeeListItemDto>[] = [
    { id: 'number', header: t('fields.employeeNumber'), value: (e) => e.employeeNumber },
    { id: 'name', header: t('fields.fullName'), value: (e) => e.fullName },
    { id: 'email', header: t('fields.workEmail'), value: (e) => e.workEmail },
    { id: 'company', header: t('fields.companyId'), value: (e) => (ar ? e.company.nameAr : e.company.nameEn) },
    { id: 'unit', header: t('fields.orgNodeId'), value: unit },
    { id: 'title', header: t('fields.jobTitleId'), value: title },
    { id: 'status', header: t('statusLabel'), value: (e) => tc(e.isActive ? 'status.active' : 'status.inactive') },
    { id: 'flags', header: t('flagsColumn'), value: flags },
  ];
  return { columns, exportColumns };
}
