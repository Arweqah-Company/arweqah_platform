import { CorePermission } from '@arweqah-platform/shared';
import { Eye, ListChecks } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { ExchangeButtons } from '@/shared/data-exchange/exchange-buttons';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, DataTable, EmptyState, GroupSelect, ListToolbar, RowAction, ViewSwitch } from '@/shared/ui';
import type { TaskGrouping, TaskListItemDto } from '@arweqah-platform/shared';
import { TaskBoard, type BoardLane } from '../board/task-board';
import { GROUPINGS, groupLabel } from './tasks-filters';
import { useTaskColumns, useTaskExportColumns } from './tasks-columns';
import type { TaskListState } from './use-task-list';

/** The one list of tasks of my tasks and my team: the same filters, search and order feed a table and a Kanban board. */
export function TaskListView({ state, caption, empty, lanesBy }: { state: TaskListState; caption: string; empty: ReactNode; lanesBy?: 'person' }) {
  const { t } = useTranslation('tasks');
  const { t: tc } = useTranslation();
  const navigate = useNavigate();
  const columns = useTaskColumns();
  const exportColumns = useTaskExportColumns();
  const { list, fields } = state;
  const rows = state.table.rows ?? [];
  const toolbar = (
    <ListToolbar
      listKey="tasks"
      {...list.toolbar({ label: t('searchLabel'), placeholder: t('searchPlaceholder') }, fields, false)}
      actions={
        <>
          {!state.board && <GroupSelect label={t('groupBy.label')} noneLabel={t('groupBy.none')} options={GROUPINGS.map((g) => ({ value: g, label: t(`groupBy.${g}`) }))} value={state.groupBy} onChange={state.setGroupBy} />}
          <ViewSwitch value={state.mode} onChange={state.setMode} choices={state.views} />
          <ExchangeButtons permissions={{ export: CorePermission.TasksExport }} exporting={{ columns: exportColumns, filename: 'tasks', pageRows: rows, total: state.table.page?.total ?? rows.length, loadAll: state.loadAll }} />
        </>
      }
    />
  );
  if (state.board) return <BoardPanel state={state} toolbar={toolbar} empty={empty} lanesBy={lanesBy} />;
  return (
    <DataTable<TaskListItemDto>
      listKey="tasks"
      {...state.table}
      caption={caption}
      toolbar={toolbar}
      rowKey={(x) => x.id}
      onRowClick={(x) => navigate(`/tasks/${x.id}`)}
      actions={(x) => <RowAction label={tc('actions.view')} icon={Eye} to={`/tasks/${x.id}`} />}
      groupOf={state.groupBy ? (x) => groupLabel(x, state.groupBy as TaskGrouping, t, state.today) : undefined}
      sort={state.sort}
      onSort={state.onSort}
      empty={empty}
      columns={columns}
      error={state.query.error}
    />
  );
}

/** The board's content for what the query answered: loading, an error, nothing, or the lanes (one, or one per person). */
function BoardContent({ state, empty, lanesBy }: { state: TaskListState; empty: ReactNode; lanesBy?: 'person' }) {
  const { t } = useTranslation('tasks');
  const { t: tc } = useTranslation();
  const data = state.query.data;
  if (state.query.error) return <Alert>{errorMessage(tc, state.query.error)}</Alert>;
  if (!data) return <div role="status" aria-label={t('loading')} className="h-24 animate-pulse rounded-2xl bg-neutral-50" />;
  if (data.total === 0) return <>{empty}</>;
  const lanes: BoardLane[] = lanesBy === 'person' ? lanesByPerson(data.items) : [{ id: 'all', tasks: data.items }];
  return (
    <>
      <TaskBoard lanes={lanes} today={state.today} />
      {data.total > data.items.length && <p className="mt-3 text-xs text-muted">{t('board.truncated', { shown: data.items.length, total: data.total })}</p>}
    </>
  );
}

function BoardPanel({ state, toolbar, empty, lanesBy }: { state: TaskListState; toolbar: ReactNode; empty: ReactNode; lanesBy?: 'person' }) {
  return (
    <div data-tour="main-list" className="rounded-3xl border border-neutral-200 bg-white p-3 shadow-sm shadow-ink/5 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-end gap-3">{toolbar}</div>
      <BoardContent state={state} empty={empty} lanesBy={lanesBy} />
    </div>
  );
}

function lanesByPerson(items: TaskListItemDto[]): BoardLane[] {
  const byPerson = new Map<string, BoardLane>();
  for (const task of items) {
    const lane = byPerson.get(task.assignee.id) ?? { id: task.assignee.id, label: task.assignee.name, tasks: [] };
    lane.tasks.push(task);
    byPerson.set(task.assignee.id, lane);
  }
  return [...byPerson.values()];
}

export const TasksEmpty = ({ narrowed, title, hint }: { narrowed: boolean; title: string; hint: string }) => {
  const { t } = useTranslation('tasks');
  return <EmptyState icon={ListChecks} title={narrowed ? t('noMatches') : title} description={narrowed ? undefined : hint} />;
};
