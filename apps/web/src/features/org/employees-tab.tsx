import { CorePermission, type OrgUnitEmployeeDto } from '@arweqah-platform/shared';
import { Eye, Users } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExchangeButtons } from '@/shared/data-exchange/exchange-buttons';
import type { ExportColumn } from '@/shared/data-exchange/types';
import { matchesText } from '@/shared/lib/text-match';
import { useListPage } from '@/shared/lib/use-list-page';
import { Avatar, DataTable, DetailsDialog, EmptyState, ListToolbar, RowAction, type Column } from '@/shared/ui';
import { useUnitEmployees } from './api';
import type { DetailsContext } from './details-tabs';
import { nodeName } from './org-model';

/** The people the search keeps (name, work number, work e-mail, manager). */
export const filterUnitEmployees = (rows: readonly OrgUnitEmployeeDto[], term: string): OrgUnitEmployeeDto[] =>
  rows.filter((p) => matchesText([p.fullName, p.employeeNumber, p.workEmail, p.managerName], term));

const ltr = (value: string) => <bdi dir="ltr">{value}</bdi>;

/** The columns of the list and of its export. */
function useEmployeeColumns(): { columns: Column<OrgUnitEmployeeDto>[]; exportColumns: ExportColumn<OrgUnitEmployeeDto>[] } {
  const { t } = useTranslation('org');
  const columns: Column<OrgUnitEmployeeDto>[] = [
    { id: 'name', header: t('employees.name'), cell: (p) => <span className="flex items-center gap-3"><Avatar name={p.fullName} /><span className="font-medium">{p.fullName}</span></span> },
    { id: 'number', header: t('employees.number'), cell: (p) => ltr(p.employeeNumber) },
    { id: 'email', header: t('employees.workEmail'), cell: (p) => ltr(p.workEmail) },
    { id: 'manager', header: t('employees.manager'), cell: (p) => p.managerName ?? '—' },
  ];
  const exportColumns: ExportColumn<OrgUnitEmployeeDto>[] = [
    { id: 'name', header: t('employees.name'), value: (p) => p.fullName },
    { id: 'number', header: t('employees.number'), value: (p) => p.employeeNumber },
    { id: 'email', header: t('employees.workEmail'), value: (p) => p.workEmail },
    { id: 'manager', header: t('employees.manager'), value: (p) => p.managerName },
  ];
  return { columns, exportColumns };
}

/** The people placed directly in the unit; a click on a row opens their work number, work e-mail, unit and direct manager. */
export function EmployeesTab({ node }: DetailsContext) {
  const { t, i18n } = useTranslation('org');
  const people = useUnitEmployees(node.id);
  const list = useListPage('org-unit-employees');
  const { columns, exportColumns } = useEmployeeColumns();
  const [open, setOpen] = useState<OrgUnitEmployeeDto | null>(null);
  const rows = filterUnitEmployees(people.data ?? [], list.term);
  const exporting = { columns: exportColumns, filename: 'unit-employees', pageRows: rows, total: rows.length, loadAll: async () => rows };
  return (
    <>
      <DataTable<OrgUnitEmployeeDto>
        listKey="org-unit-employees"
        caption={t('employees.tableLabel')}
        view={list.view}
        rows={rows}
        rowKey={(p) => p.id}
        isLoading={people.isLoading}
        error={people.isError ? people.error : undefined}
        onRowClick={setOpen}
        toolbar={<ListToolbar listKey="org-unit-employees" {...list.toolbar({ label: t('employees.searchLabel'), placeholder: t('employees.searchPlaceholder') }, [])} actions={<ExchangeButtons permissions={{ export: CorePermission.EmployeesExport }} exporting={exporting} />} />}
        actions={(p) => <RowAction label={`${t('employees.detailsTitle')}: ${p.fullName}`} icon={Eye} onClick={() => setOpen(p)} />}
        empty={<EmptyState icon={Users} title={list.narrowed ? t('employees.noMatches') : t('employees.empty')} description={list.narrowed ? undefined : t('employees.emptyHint')} />}
        columns={columns}
      />
      {open && (
        <DetailsDialog
          title={open.fullName}
          description={t('employees.detailsTitle')}
          onClose={() => setOpen(null)}
          rows={[
            [t('employees.number'), ltr(open.employeeNumber)],
            [t('employees.workEmail'), ltr(open.workEmail)],
            [t('employees.unit'), nodeName(node, i18n.language === 'ar')],
            [t('employees.manager'), open.managerName],
          ]}
        />
      )}
    </>
  );
}
