import { CorePermission, type CompanyDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Can, usePermissions } from '@/core/permissions/can';
import { errorMessage } from '@/shared/lib/error-message';
import { ExchangeButtons } from '@/shared/data-exchange/exchange-buttons';
import type { ExportColumn } from '@/shared/data-exchange/types';
import { useListPage } from '@/shared/lib/use-list-page';
import { matchesText } from '@/shared/lib/text-match';
import { Badge, Button, ConfirmDialog, DataTable, ListToolbar, PageHeader, type FilterField } from '@/shared/ui';
import { useCompanies, useDeleteCompany } from './api';
import { useCompaniesImport } from './companies-import';
import { CompanyDialog } from './company-dialog';

export function CompaniesPage() {
  const { t, i18n } = useTranslation('companies');
  const { t: tc } = useTranslation();
  const companies = useCompanies();
  const list = useListPage('companies');
  const importing = useCompaniesImport();
  const fields: FilterField[] = [
    { id: 'status', label: t('status'), type: 'select', options: [{ value: 'active', label: tc('status.active') }, { value: 'inactive', label: tc('status.inactive') }] },
    { id: 'employees', label: t('employees'), type: 'select', options: [{ value: 'with', label: t('filters.withEmployees') }, { value: 'without', label: t('filters.withoutEmployees') }] },
  ];
  const canImport = usePermissions().can(CorePermission.CompaniesImport);
  const exportColumns: ExportColumn<CompanyDto>[] = [
    { id: 'code', header: t('code'), value: (c) => c.code },
    { id: 'nameAr', header: t('nameAr'), value: (c) => c.nameAr },
    { id: 'nameEn', header: t('nameEn'), value: (c) => c.nameEn },
    { id: 'employees', header: t('employees'), value: (c) => c.employeesCount },
    { id: 'status', header: t('status'), value: (c) => tc(c.isActive ? 'status.active' : 'status.inactive') },
  ];
  const rows = companies.data?.filter(
    (c) =>
      matchesText([c.code, c.nameAr, c.nameEn], list.term) &&
      (!list.filters.values.status || c.isActive === (list.filters.values.status === 'active')) &&
      (!list.filters.values.employees || (c.employeesCount > 0) === (list.filters.values.employees === 'with')),
  );
  const remove = useDeleteCompany();
  const [editing, setEditing] = useState<{ company: CompanyDto | null } | null>(null);
  const [deleting, setDeleting] = useState<CompanyDto | null>(null);
  const ar = i18n.language === 'ar';

  const confirmDelete = async () => {
    try {
      await remove.mutateAsync((deleting as CompanyDto).id);
      toast.success(t('deleted'));
    } catch (error) {
      toast.error(errorMessage(tc, error));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <>
      <PageHeader title={t('title')} description={t('description')} actions={<Can permission={CorePermission.CompaniesCreate}><Button onClick={() => setEditing({ company: null })}>{t('new')}</Button></Can>} />
      <DataTable<CompanyDto>
        listKey="companies"
        caption={t('title')}
        view={list.view}
        toolbar={<ListToolbar listKey="companies" {...list.toolbar({ label: t('searchLabel'), placeholder: t('searchPlaceholder') }, fields)} actions={<ExchangeButtons permissions={{ export: CorePermission.CompaniesExport, import: CorePermission.CompaniesImport }} exporting={{ columns: exportColumns, filename: 'companies', pageRows: rows ?? [], total: rows?.length ?? 0, loadAll: async () => rows ?? [] }} importing={canImport ? importing : undefined} />} />}
        rows={rows}
        isLoading={companies.isPending}
        error={companies.error}
        rowKey={(c) => c.id}
        columns={[
          { id: 'code', header: t('code'), cell: (c) => <span dir="ltr" className="font-medium">{c.code}</span> },
          { id: 'name', header: t('name'), cell: (c) => (ar ? c.nameAr : c.nameEn) },
          { id: 'employees', header: t('employees'), cell: (c) => <span dir="ltr">{c.employeesCount}</span> },
          { id: 'status', header: t('status'), cell: (c) => <Badge tone={c.isActive ? 'success' : 'neutral'}>{tc(c.isActive ? 'status.active' : 'status.inactive')}</Badge> },
          {
            id: 'actions',
            header: tc('actions.edit'),
            hideHeader: true,
            className: 'w-40 text-end',
            cell: (c) => (
              <>
                <Can permission={CorePermission.CompaniesUpdate}><Button size="sm" variant="ghost" onClick={() => setEditing({ company: c })}>{tc('actions.edit')}</Button></Can>
                <Can permission={CorePermission.CompaniesDelete}><Button size="sm" variant="ghost" className="text-danger-text" onClick={() => setDeleting(c)}>{tc('actions.delete')}</Button></Can>
              </>
            ),
          },
        ]}
      />
      {editing && <CompanyDialog company={editing.company} open onOpenChange={(o) => !o && setEditing(null)} />}
      <ConfirmDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} tone="danger" title={t('deleteTitle')} description={deleting ? t('deleteBody', { name: ar ? deleting.nameAr : deleting.nameEn }) : undefined} confirmLabel={tc('actions.delete')} onConfirm={confirmDelete} />
    </>
  );
}
