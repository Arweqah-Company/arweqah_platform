import { CorePermission, type EmployeeListItemDto } from '@arweqah-platform/shared';
import { Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Can, usePermissions } from '@/core/permissions/can';
import { ExchangeButtons } from '@/shared/data-exchange/exchange-buttons';
import { useListPage } from '@/shared/lib/use-list-page';
import { useServerList } from '@/shared/lib/use-server-list';
import { Button, DataTable, EmptyState, ListToolbar, PageHeader } from '@/shared/ui';
import { useEmployeeColumns } from './employees-columns';
import { toEmployeesQuery, useEmployeeFilterFields } from './employees-filters';
import { useEmployeesImport } from './employees-import';

export function EmployeesPage() {
  const { t } = useTranslation('employees');
  const list = useListPage('employees');
  const fields = useEmployeeFilterFields(list.filters.values);
  const { columns, exportColumns } = useEmployeeColumns();
  const importing = useEmployeesImport();
  const canCreate = usePermissions().can(CorePermission.EmployeesCreate);
  const { query, loadAll, table } = useServerList<EmployeeListItemDto>('employees', '/employees', list, { search: list.term || undefined, ...toEmployeesQuery(list.filters.values) });
  const exchange = <ExchangeButtons permissions={{ export: CorePermission.EmployeesExport, import: CorePermission.EmployeesImport }} exporting={{ columns: exportColumns, filename: 'employees', pageRows: query.data?.items ?? [], total: query.data?.total ?? 0, loadAll }} importing={canCreate ? importing : undefined} />;

  return (
    <>
      <PageHeader title={t('title')} description={t('description')} actions={<Can permission={CorePermission.EmployeesCreate}><Button asChild><Link to="/employees/new">{t('add')}</Link></Button></Can>} />
      <DataTable<EmployeeListItemDto>
        listKey="employees"
        {...table}
        caption={t('title')}
        title={t('allTitle')}
        toolbar={<ListToolbar listKey="employees" {...list.toolbar({ label: t('searchLabel'), placeholder: t('searchPlaceholder') }, fields)} actions={exchange} />}
        rowKey={(e) => e.id}
        empty={<EmptyState icon={Users} title={list.narrowed ? t('noMatches') : t('empty')} description={list.narrowed ? undefined : t('emptyHint')} />}
        columns={columns}
      />
    </>
  );
}
