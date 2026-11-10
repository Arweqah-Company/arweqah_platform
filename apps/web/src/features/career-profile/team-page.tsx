import { CorePermission, TEAM_STATUSES, type TeamMemberDto, type TeamPageDto } from '@arweqah-platform/shared';
import { Eye, Users } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '@/core/permissions/can';
import { ExchangeButtons } from '@/shared/data-exchange/exchange-buttons';
import type { ExportColumn } from '@/shared/data-exchange/types';
import { useListPage } from '@/shared/lib/use-list-page';
import { useServerList } from '@/shared/lib/use-server-list';
import { Alert, Badge, DataTable, EmptyState, ListToolbar, RowAction, type Column, type FilterField } from '@/shared/ui';
import { formatMinutes } from './format-minutes';
import { TeamMemberDialog } from './team-dialog';

const STATUS_TONE = { regular: 'success', late: 'danger', no_path: 'neutral' } as const;

/** The work-details columns (unit, company, e-mail, phone): only for a viewer who holds `directory.view`; the API sends `contact` to nobody else. */
function useContactColumns(ar: boolean, t: (key: string) => string) {
  const unit = (x: TeamMemberDto) => (ar ? x.contact?.unitNameAr : x.contact?.unitNameEn) ?? null;
  const company = (x: TeamMemberDto) => (ar ? x.contact?.companyNameAr : x.contact?.companyNameEn) ?? null;
  const ltr = (value: string | null | undefined) => (value ? <span dir="ltr">{value}</span> : '—');
  const columns: Column<TeamMemberDto>[] = [
    { id: 'unit', header: t('team.columns.unit'), cell: (x) => unit(x) ?? '—' },
    { id: 'company', header: t('team.columns.company'), cell: (x) => company(x) ?? '—' },
    { id: 'email', header: t('team.columns.email'), cell: (x) => ltr(x.contact?.workEmail) },
    { id: 'phone', header: t('team.columns.phone'), cell: (x) => ltr(x.contact?.workPhone) },
  ];
  const exportColumns: ExportColumn<TeamMemberDto>[] = [
    { id: 'unit', header: t('team.columns.unit'), value: unit }, { id: 'company', header: t('team.columns.company'), value: company },
    { id: 'email', header: t('team.columns.email'), value: (x) => x.contact?.workEmail ?? null }, { id: 'phone', header: t('team.columns.phone'), value: (x) => x.contact?.workPhone ?? null },
  ];
  return { columns, exportColumns };
}

/** The columns of the list and of its export: the share of mandatory and necessary units as a bar, the hours, what is late and the state. */
function useTeamColumns(withContact: boolean): { columns: Column<TeamMemberDto>[]; exportColumns: ExportColumn<TeamMemberDto>[] } {
  const { t, i18n } = useTranslation('career-profile');
  const ar = i18n.language === 'ar';
  const contact = useContactColumns(ar, t);
  const title = (x: TeamMemberDto) => (i18n.language === 'ar' ? x.titleNameAr : x.titleNameEn) || x.titleNameAr || '';
  const hours = (x: TeamMemberDto) => (x.yearMinutes ? `${formatMinutes(x.approvedMinutes, t)} / ${formatMinutes(x.yearMinutes, t)}` : formatMinutes(x.approvedMinutes, t));
  const share = (x: TeamMemberDto) => (x.requiredTotal ? Math.round((x.requiredDone / x.requiredTotal) * 100) : 0);
  const columns: Column<TeamMemberDto>[] = [
    { id: 'employee', header: t('team.columns.employee'), cell: (x) => <span className="font-medium">{x.name}</span> },
    { id: 'title', header: t('team.columns.title'), cell: title },
    { id: 'progress', header: t('team.columns.progress'), cell: (x) => (x.status === 'no_path' ? '—' : <span className="flex items-center gap-2"><progress className="h-2.5 w-24 accent-petrol-800" value={share(x)} max={100} aria-label={t('team.columns.progress')} /><span dir="ltr" className="text-sm tabular-nums">{share(x)}%</span></span>) },
    { id: 'hours', header: t('team.columns.hours'), cell: (x) => (x.status === 'no_path' ? '—' : hours(x)) },
    { id: 'late', header: t('team.columns.late'), cell: (x) => (x.overdue ? <Badge tone="danger">{x.overdue}</Badge> : '—') },
    { id: 'status', header: t('team.columns.status'), cell: (x) => <Badge tone={STATUS_TONE[x.status]}>{t(`team.status.${x.status}`)}</Badge> },
    ...(withContact ? contact.columns : []),
  ];
  const exportColumns: ExportColumn<TeamMemberDto>[] = [
    { id: 'employee', header: t('team.columns.employee'), value: (x) => x.name }, { id: 'title', header: t('team.columns.title'), value: title },
    { id: 'progress', header: t('team.columns.progress'), value: (x) => `${share(x)}%` }, { id: 'hours', header: t('team.columns.hours'), value: hours },
    { id: 'late', header: t('team.columns.late'), value: (x) => x.overdue }, { id: 'status', header: t('team.columns.status'), value: (x) => t(`team.status.${x.status}`) },
    ...(withContact ? contact.exportColumns : []),
  ];
  return { columns, exportColumns };
}

/** The state filter, and what the server was asked: the search and the state. */
function useTeamQuery(list: ReturnType<typeof useListPage>) {
  const { t } = useTranslation('career-profile');
  const fields: FilterField[] = [{ id: 'status', label: t('team.columns.status'), type: 'select', options: TEAM_STATUSES.filter((s) => s !== 'no_path').map((s) => ({ value: s, label: t(`team.status.${s}`) })) }];
  return { fields, params: { search: list.term || undefined, status: list.filters.values.status || undefined } };
}

/** «My career team», a tab of the Employees page: the people the viewer's scope reaches with the numbers of their path; a click on a row opens the member. */
export function CareerTeamPanel() {
  const { t } = useTranslation('career-profile');
  const list = useListPage('career-team');
  const { can } = usePermissions();
  const { columns, exportColumns } = useTeamColumns(can(CorePermission.DirectoryView));
  const [open, setOpen] = useState<TeamMemberDto | null>(null);
  const { fields, params } = useTeamQuery(list);
  const { query, loadAll, table } = useServerList<TeamMemberDto>('career-team', '/career/team', list, params);
  const page = query.data as TeamPageDto | undefined;
  const exporting = { columns: exportColumns, filename: 'career-team', pageRows: page?.items ?? [], total: page?.total ?? 0, loadAll };
  return (
    <>
      <p className="mb-4 max-w-[65ch] text-muted">{t('team.description')}</p>
      {!!page?.lateCount && <Alert tone="warning">{t('team.lateAlert', { count: page.lateCount })}</Alert>}
      <DataTable<TeamMemberDto>
        listKey="career-team"
        {...table}
        caption={t('team.title')}
        toolbar={<ListToolbar listKey="career-team" {...list.toolbar({ label: t('team.searchLabel'), placeholder: t('team.searchPlaceholder') }, fields)} actions={<ExchangeButtons permissions={{ export: CorePermission.CareerTeamExport }} exporting={exporting} />} />}
        rowKey={(x) => x.employeeId}
        onRowClick={setOpen}
        actions={(x) => <RowAction label={`${t('team.open')}: ${x.name}`} icon={Eye} onClick={() => setOpen(x)} />}
        empty={<EmptyState icon={Users} title={list.narrowed ? t('team.noMatches') : t('team.empty')} />}
        columns={columns}
      />
      {open && <TeamMemberDialog member={open} onClose={() => setOpen(null)} />}
    </>
  );
}
