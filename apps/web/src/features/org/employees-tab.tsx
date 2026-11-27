import { CorePermission, type OrgUnitEmployeeDto } from '@arweqah-platform/shared';
import { Eye, Users } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExchangeButtons } from '@/shared/data-exchange/exchange-buttons';
import type { ExportColumn } from '@/shared/data-exchange/types';
import { matchesText } from '@/shared/lib/text-match';
import { useListPage } from '@/shared/lib/use-list-page';
import { Avatar, DataTable, EmptyState, ListToolbar, RowAction, type Column } from '@/shared/ui';
import { useUnitEmployees } from './api';
import type { DetailsContext } from './details-tabs';
import { nodeName } from './org-model';
import { PersonDialog } from './person-dialog';

/** The people the search keeps (name, work number, work e-mail, manager). */
export const filterUnitEmployees = (rows: readonly OrgUnitEmployeeDto[], term: string): OrgUnitEmployeeDto[] =>
  rows.filter((p) => matchesText([p.fullName, p.employeeNumber, p.workEmail, p.managerName], term));


/** The list shows names only (the details tab is narrow); the rest opens in the popup on a click. The export keeps every column. */
function useEmployeeColumns(): { columns: Column<OrgUnitEmployeeDto>[]; exportColumns: ExportColumn<OrgUnitEmployeeDto>[] } {
  const { t } = useTranslation('org');
  const columns: Column<OrgUnitEmployeeDto>[] = [
    { id: 'name', header: t('employees.name'), cell: (p) => <span className="flex items-center gap-3"><Avatar name={p.fullName} /><span className="font-medium">{p.fullName}</span></span> },
  ];
  const exportColumns: ExportColumn<OrgUnitEmployeeDto>[] = [
    { id: 'name', header: t('employees.name'), value: (p) => p.fullName },
    { id: 'number', header: t('employees.number'), value: (p) => p.employeeNumber },
    { id: 'email', header: t('employees.workEmail'), value: (p) => p.workEmail },
    { id: 'manager', header: t('employees.manager'), value: (p) => p.managerName },
  ];
  return { columns, exportColumns };
}

/** The people placed directly in the unit, names only, as a table (no cards: the owner asked for the table alone here, FR-221); a click on a name opens their work number, work e-mail, unit and direct manager. */
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
        view="table"
        rows={rows}
        rowKey={(p) => p.id}
        isLoading={people.isLoading}
        error={people.isError ? people.error : undefined}
        onRowClick={setOpen}
        toolbar={<ListToolbar listKey="org-unit-employees" {...list.toolbar({ label: t('employees.searchLabel'), placeholder: t('employees.searchPlaceholder') }, [], false)} actions={<ExchangeButtons permissions={{ export: CorePermission.EmployeesExport }} exporting={exporting} />} />}
        actions={(p) => <RowAction label={`${t('employees.detailsTitle')}: ${p.fullName}`} icon={Eye} onClick={() => setOpen(p)} />}
        empty={<EmptyState icon={Users} title={list.narrowed ? t('employees.noMatches') : t('employees.empty')} description={list.narrowed ? undefined : t('employees.emptyHint')} />}
        columns={columns}
      />
      {open && <PersonDialog person={open} unit={nodeName(node, i18n.language === 'ar')} onClose={() => setOpen(null)} />}
    </>
  );
}
