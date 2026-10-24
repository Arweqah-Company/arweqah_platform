import { riyadhToday, type TaskGrouping, type TaskListItemDto, type TaskSortKey } from '@arweqah-platform/shared';
import { Kanban, Table2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { FilterValues } from '@/shared/lib/use-filters';
import { useListPage } from '@/shared/lib/use-list-page';
import { useServerList } from '@/shared/lib/use-server-list';
import { useViewMode } from '@/shared/lib/use-view-mode';
import type { TableSort } from '@/shared/ui';
import { useTaskOptions } from '../api';
import { toTasksQuery, useTaskFilterFields } from './tasks-filters';

export type TaskView = 'table' | 'board';

const BOARD_LIMIT = 100;

/**
 * The state "my tasks" and "my team" share: the filters, search, order and grouping that both views (table and board) answer,
 * the choice of view (remembered per list), and the list from the API. The board asks for a single large page of every status.
 */
interface TaskListOptions {
  /** The list's key: the query key, the remembered view and the filter state are named after it. */
  id: string;
  path: string;
  /** What the page adds to the query (the tab, or how far the team reaches). */
  extra: Record<string, string | number | boolean | undefined>;
  withArchive: boolean;
  initialFilters?: FilterValues;
}

export function useTaskList({ id, path, extra, withArchive, initialFilters }: TaskListOptions) {
  const { t } = useTranslation('tasks');
  const [mode, setMode] = useViewMode<TaskView>(`${id}-mode`, { modes: ['table', 'board'], phoneDefault: 'table' });
  const [groupBy, setGroupBy] = useState<TaskGrouping | ''>('');
  const [sort, setSort] = useState<TableSort>({ key: 'dueDate', dir: 'asc' });
  const options = useTaskOptions();
  const list = useListPage(id, initialFilters);
  const fields = useTaskFilterFields(options.data, withArchive);
  const board = mode === 'board';
  const params = { ...extra, search: list.term || undefined, ...toTasksQuery(list.filters.values, board), groupBy: !board && groupBy ? groupBy : undefined, sort: sort.key as TaskSortKey, dir: sort.dir };
  const boardList = { ...list, page: 1, pageSize: BOARD_LIMIT };
  const { query, table, loadAll } = useServerList<TaskListItemDto>(id, path, board ? boardList : list, params);
  const onSort = (key: string) => setSort((s) => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }));
  const views = [{ id: 'table' as const, label: t('views.table'), icon: Table2 }, { id: 'board' as const, label: t('views.board'), icon: Kanban }];
  return { list, fields, table, query, loadAll, mode, setMode, views, groupBy, setGroupBy, sort, onSort, board, today: riyadhToday(), options: options.data };
}

export type TaskListState = ReturnType<typeof useTaskList>;
