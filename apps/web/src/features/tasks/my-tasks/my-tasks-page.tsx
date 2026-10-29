import { CorePermission, TASK_TABS } from '@arweqah-platform/shared';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { useMe } from '@/core/auth/session';
import { Can, usePermissions } from '@/core/permissions/can';
import { Button, PageHeader } from '@/shared/ui';
import { NewTaskDialog } from '../new-task/new-task-dialog';
import { TaskListView, TasksEmpty } from './task-list-view';
import { TaskTabs, type TasksTab } from './task-tabs';
import { TeamControls, type Reach } from './team-controls';
import { useTaskList } from './use-task-list';

/** Filters a link may open the page with (the home page's numbers). */
const PRESETS = ['overdue', 'stale'];

/** The tabs a link may open the page on. */
const START_TABS: TasksTab[] = [...TASK_TABS, 'team'];

/** My team: only for those whose team key reaches beyond themselves, and unless an administrator hid it. */
function useTeamTab(): boolean {
  const me = useMe().data;
  const reach = me?.permissions.find((p) => p.key === CorePermission.TasksTeamView)?.scope;
  return !!reach && reach !== 'own' && !me?.hiddenPages.includes('tasks-team');
}

/** The page's own state: the tab (a link may choose it), how far the team reaches, and the list that answers them. */
function useMyTasks() {
  const [params] = useSearchParams();
  const withTeam = useTeamTab();
  const start = START_TABS.find((x) => x === params.get('tab'));
  const [chosen, setTab] = useState<TasksTab>(start ?? 'assigned');
  const [reach, setReach] = useState<Reach>('direct');
  const [lanes, setLanes] = useState(false);
  const [creating, setCreating] = useState(params.get('new') === '1');
  const withArchive = usePermissions().can(CorePermission.TasksArchiveView);
  const preset = PRESETS.find((x) => x === params.get('filter'));
  const tab = chosen === 'team' && !withTeam ? 'assigned' : chosen;
  const team = tab === 'team';
  const state = useTaskList({ id: 'tasks', path: team ? '/tasks/team' : '/tasks', extra: team ? { reach } : { tab }, withArchive: withArchive && !team, initialFilters: preset ? { [preset]: 'true' } : undefined });
  const change = <T,>(set: (value: T) => void) => (value: T) => {
    set(value);
    state.list.setPage(1);
  };
  return { tab, team, withTeam, reach, lanes, setLanes, creating, setCreating, state, onTab: change(setTab), onReach: change(setReach) };
}

/** My tasks: what is asked of me, what I asked of others, what I follow, and (for a manager) my team; open tasks by due date at first. */
export function MyTasksPage() {
  const { t } = useTranslation('tasks');
  const page = useMyTasks();
  const { state, tab } = page;
  return (
    <>
      <PageHeader title={t('title')} description={t('description')} actions={<Can permission={CorePermission.TasksCreate}><Button data-tour="task-new" onClick={() => page.setCreating(true)}><Plus className="size-4" aria-hidden />{t('newTask')}</Button></Can>} />
      <TaskTabs tab={tab} withTeam={page.withTeam} onChange={page.onTab} />
      {page.team && <TeamControls reach={page.reach} onReach={page.onReach} board={state.board} lanes={page.lanes} onLanes={page.setLanes} />}
      <TaskListView state={state} caption={t(`tabs.${tab}`)} lanesBy={page.team && page.lanes ? 'person' : undefined} empty={<TasksEmpty narrowed={state.list.narrowed} title={t(`empty.${tab}`)} hint={t(`emptyHint.${tab}`)} />} />
      <NewTaskDialog open={page.creating} onOpenChange={page.setCreating} />
    </>
  );
}
