import { CorePermission, EVAL_TEAM_SCOPES, EVAL_TEAM_STATUSES, type CycleStage, type TeamEvaluationPageDto, type TeamEvaluationRowDto } from '@arweqah-platform/shared';
import { CalendarCheck, Eye, Pencil, Users } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExchangeButtons } from '@/shared/data-exchange/exchange-buttons';
import { useListPage } from '@/shared/lib/use-list-page';
import { useServerList } from '@/shared/lib/use-server-list';
import { Alert, DataTable, EmptyState, ListToolbar, PageHeader, RowAction, type FilterField } from '@/shared/ui';
import { CycleStepper } from './cycle-stepper';
import { StageDialog } from './stage-dialog';
import { Can } from '@/core/permissions/can';
import { MemberMilestonesDialog } from './member-milestones-dialog';
import { TeamDialog, useBlockText } from './team-dialog';
import { useTeamColumns } from './team-columns';

/** The filters of the list and what the server is asked: the search, the scope (everyone below or direct reports) and the state of the viewer's evaluation. */
function useTeamQuery(list: ReturnType<typeof useListPage>) {
  const { t } = useTranslation('performance');
  const fields: FilterField[] = [
    { id: 'scope', label: t('team.filters.scope'), type: 'select', options: EVAL_TEAM_SCOPES.map((s) => ({ value: s, label: t(`team.scopes.${s}`) })) },
    { id: 'status', label: t('team.filters.status'), type: 'select', options: EVAL_TEAM_STATUSES.map((s) => ({ value: s, label: t(`team.statuses.${s}`) })) },
  ];
  return { fields, params: { search: list.term || undefined, scope: list.filters.values.scope || undefined, status: list.filters.values.status || undefined } };
}

/** The row's own action: «evaluate» when the viewer can write now, «view» otherwise (the window says why it is read only). */
function RowOpen({ row, onOpen, onMilestones }: { row: TeamEvaluationRowDto; onOpen: (row: TeamEvaluationRowDto) => void; onMilestones: (row: TeamEvaluationRowDto) => void }) {
  const { t } = useTranslation('performance');
  const write = !row.block;
  return (
    <>
      <RowAction label={`${t(write ? 'team.evaluate' : 'team.view')}: ${row.name}`} icon={write ? Pencil : Eye} onClick={() => onOpen(row)} />
      <Can permission={CorePermission.PerformanceMilestoneView}><RowAction label={`${t('team.milestones')}: ${row.name}`} icon={CalendarCheck} onClick={() => onMilestones(row)} /></Can>
    </>
  );
}

/** The notices box: how many people wait for the viewer's evaluation, and a hint at the first one's name (a click opens them). */
function Waiting({ page, onOpen }: { page: TeamEvaluationPageDto; onOpen: (row: TeamEvaluationRowDto) => void }) {
  const { t } = useTranslation('performance');
  const text = useBlockText();
  const ready = page.items.filter((r) => r.selfSent && r.mine !== 'sent' && !r.block);
  if (!page.cycle) return <Alert tone="info">{t('team.noCycle')}</Alert>;
  const blocked = page.items.find((r) => r.block);
  return (
    <>
      {!!page.waitingCount && <Alert tone="info">{t('team.waiting', { count: page.waitingCount })}</Alert>}
      {ready.length > 0 && <ul className="flex flex-col gap-1 text-sm" aria-label={t('team.notices')}>{ready.slice(0, 5).map((r) => <li key={r.employeeId}><button type="button" className="text-link underline" onClick={() => onOpen(r)}>{t('team.notice', { name: r.name })}</button></li>)}</ul>}
      {blocked?.block && <Alert tone="warning">{text(blocked.block, blocked.directManagerName)}</Alert>}
    </>
  );
}

/** The list the page shows: the server's page (search, scope and status in the query), its export, and the filters. */
function useTeamList() {
  const list = useListPage('performance-team');
  const { fields, params } = useTeamQuery(list);
  const { query, loadAll, table } = useServerList<TeamEvaluationRowDto>('performance-team', '/performance/team', list, params);
  const page = query.data as TeamEvaluationPageDto | undefined;
  return { list, fields, table, page, loadAll, stage: (page?.cycle?.stage ?? 'none') as CycleStage | 'none', items: page?.items ?? [], total: page?.total ?? 0 };
}

/** «Team evaluation»: the stepper, the chain notice, and the people the viewer's scope reaches with their evaluations; a click on a row opens the evaluation window. */
export function TeamEvaluationPage() {
  const { t } = useTranslation('performance');
  const { list, fields, table, page, loadAll, stage, items, total } = useTeamList();
  const { columns, exportColumns } = useTeamColumns();
  const [open, setOpen] = useState<TeamEvaluationRowDto | null>(null);
  const [step, setStep] = useState<CycleStage | null>(null);
  const [milestones, setMilestones] = useState<TeamEvaluationRowDto | null>(null);
  const exporting = { columns: exportColumns, filename: 'performance-team', pageRows: items, total, loadAll };
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t('team.title')} description={t('team.description')} />
      <CycleStepper stage={stage} onOpen={setStep} />
      <Alert tone="info">{t('team.chain')}</Alert>
      {page && <Waiting page={page} onOpen={setOpen} />}
      <DataTable<TeamEvaluationRowDto>
        listKey="performance-team"
        {...table}
        caption={t('team.title')}
        toolbar={<ListToolbar listKey="performance-team" {...list.toolbar({ label: t('team.searchLabel'), placeholder: t('team.searchPlaceholder') }, fields)} actions={<ExchangeButtons permissions={{ export: CorePermission.PerformanceTeamExport }} exporting={exporting} />} />}
        rowKey={(x) => x.employeeId}
        onRowClick={setOpen}
        actions={(x) => <RowOpen row={x} onOpen={setOpen} onMilestones={setMilestones} />}
        empty={<EmptyState icon={Users} title={list.narrowed ? t('team.noMatches') : t('team.empty')} />}
        columns={columns}
      />
      {open && <TeamDialog row={open} onClose={() => setOpen(null)} />}
      {milestones && <MemberMilestonesDialog employeeId={milestones.employeeId} name={milestones.name} onClose={() => setMilestones(null)} />}
      {step && <StageDialog step={step} stage={stage} onClose={() => setStep(null)} />}
    </div>
  );
}
