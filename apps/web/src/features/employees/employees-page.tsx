import { CorePermission, type EmployeeListItemDto } from '@arweqah-platform/shared';
import { Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { Can } from '@/core/permissions/can';
import { ExchangeButtons } from '@/shared/data-exchange/exchange-buttons';
import { useListPage } from '@/shared/lib/use-list-page';
import { useServerList } from '@/shared/lib/use-server-list';
import { Button, DataTable, EmptyState, ListToolbar, PageHeader } from '@/shared/ui';
import { useBulkEdit } from './bulk-edit';
import { useEmployeeColumns } from './employees-columns';
import { toEmployeesQuery, useEmployeeFilterFields } from './employees-filters';
import { EmployeeRowActions } from './employee-row-actions';
import { useEmployeesImport } from './employees-import';
import { EmployeesTabs, useEmployeesTab } from './employees-tabs';
import { TeamTab } from './team-tab';

/** The Employees page: its list (who the person reaches) and, in a second tab, «My team» (FR-92). */
export function EmployeesPage() {
  const { t } = useTranslation('employees');
  const tabs = useEmployeesTab();
  const onList = tabs.tab === 'list';
  return (
    <>
      <PageHeader title={t('title')} description={t('description')} actions={onList && <Can permission={CorePermission.EmployeesCreate}><Button asChild><Link to="/employees/new">{t('add')}</Link></Button></Can>} />
      <EmployeesTabs {...tabs} />
      {onList ? <EmployeesList /> : <TeamTab />}
    </>
  );
}

function EmployeesList() {
  const { t } = useTranslation('employees');
  const navigate = useNavigate();
  const list = useListPage('employees');
  const fields = useEmployeeFilterFields(list.filters.values);
  const { columns, exportColumns } = useEmployeeColumns();
  const { importing, updating } = useEmployeesImport();
  const { query, loadAll, table } = useServerList<EmployeeListItemDto>('employees', '/employees', list, { search: list.term || undefined, ...toEmployeesQuery(list.filters.values) });
  const bulk = useBulkEdit(query.data?.items);
  const exchange = <ExchangeButtons permissions={{ export: CorePermission.EmployeesExport, import: CorePermission.EmployeesImport, update: CorePermission.EmployeesUpdate }} exporting={{ columns: exportColumns, filename: 'employees', pageRows: query.data?.items ?? [], total: query.data?.total ?? 0, loadAll }} importing={importing} updating={updating} />;

  return (
    <>
      {bulk.panel}
      <DataTable<EmployeeListItemDto>
        listKey="employees"
        {...table}
        caption={t('title')}
        title={t('allTitle')}
        toolbar={<ListToolbar listKey="employees" {...list.toolbar({ label: t('searchLabel'), placeholder: t('searchPlaceholder') }, fields)} actions={exchange} />}
        rowKey={(e) => e.id}
        selection={bulk.selection}
        onRowClick={(e) => navigate(`/employees/${e.id}`)}
        actions={(e) => <EmployeeRowActions employee={e} />}
        empty={<EmptyState icon={Users} title={list.narrowed ? t('noMatches') : t('empty')} description={list.narrowed ? undefined : t('emptyHint')} />}
        columns={columns}
      />
    </>
  );
}
