import type { DirectoryEntryDto } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import type { ExportColumn } from '@/shared/data-exchange/types';
import type { Column } from '@/shared/ui';
import { EmployeeAvatar } from './employee-avatar';

/** The columns of «My team» and the same data as text for export. */
export function useTeamColumns() {
  const { t, i18n } = useTranslation('employees', { keyPrefix: 'team' });
  const ar = i18n.language === 'ar';
  const dash = <span className="text-muted">—</span>;
  const title = (e: DirectoryEntryDto) => (e.jobTitle ? (ar ? e.jobTitle.nameAr : e.jobTitle.nameEn) : null);
  const unit = (e: DirectoryEntryDto) => (e.orgNode ? (ar ? e.orgNode.pathAr : e.orgNode.pathEn) : null);
  const company = (e: DirectoryEntryDto) => (ar ? e.company.nameAr : e.company.nameEn);
  const ltr = (value: string | null) => (value ? <span dir="ltr">{value}</span> : dash);

  const columns: Column<DirectoryEntryDto>[] = [
    { id: 'name', header: t('name'), cell: (e) => <span className="flex items-center gap-2"><EmployeeAvatar employee={e} size="sm" /><span className="font-medium">{e.fullName}</span></span> },
    { id: 'title', header: t('jobTitle'), cell: (e) => title(e) ?? dash },
    { id: 'unit', header: t('unit'), cell: (e) => (e.orgNode ? (ar ? e.orgNode.nameAr : e.orgNode.nameEn) : dash) },
    { id: 'company', header: t('company'), cell: company },
    { id: 'email', header: t('workEmail'), cell: (e) => ltr(e.workEmail) },
    { id: 'phone', header: t('workPhone'), cell: (e) => ltr(e.workPhone) },
  ];
  const exportColumns: ExportColumn<DirectoryEntryDto>[] = [
    { id: 'name', header: t('name'), value: (e) => e.fullName },
    { id: 'title', header: t('jobTitle'), value: title },
    { id: 'unit', header: t('unit'), value: unit },
    { id: 'company', header: t('company'), value: company },
    { id: 'email', header: t('workEmail'), value: (e) => e.workEmail },
    { id: 'phone', header: t('workPhone'), value: (e) => e.workPhone },
  ];
  return { columns, exportColumns };
}
