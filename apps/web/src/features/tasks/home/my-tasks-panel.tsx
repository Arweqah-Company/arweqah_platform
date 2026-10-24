import { CorePermission, type TaskStatus, type TaskSummaryDto } from '@arweqah-platform/shared';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Can } from '@/core/permissions/can';
import { Button, ProgressSplit, type SplitPart } from '@/shared/ui';
import { TaskFlags, TaskPriorityBadge } from '../task-badges';

const SPLIT: { status: TaskStatus; fill: SplitPart['fill'] }[] = [
  { status: 'todo', fill: 'fill-neutral-500' },
  { status: 'in_progress', fill: 'fill-petrol-800' },
  { status: 'awaiting_review', fill: 'fill-orange-500' },
  { status: 'pending_approval', fill: 'fill-green-400' },
];

/** My current tasks: the first open ones by due date, how my open tasks divide by status, and the way to all of them. */
export function MyTasksPanel({ summary }: { summary: TaskSummaryDto | undefined }) {
  const { t } = useTranslation('tasks');
  if (!summary) return <div role="status" aria-label={t('loading')} className="h-40 animate-pulse rounded-3xl bg-neutral-50" />;
  const parts: SplitPart[] = SPLIT.map(({ status, fill }) => ({ key: status, label: t(`status.${status}`), value: summary.byStatus[status] ?? 0, fill }));
  return (
    <section aria-labelledby="home-my-tasks" className="flex flex-col gap-4 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm shadow-ink/5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="home-my-tasks" className="text-lg font-bold">{t('home.title')}</h2>
        <Link to="/tasks" className="text-sm text-link hover:underline">{t('home.all')}</Link>
      </div>
      {summary.current.length === 0 ? (
        <div className="flex flex-col items-start gap-3 py-2">
          <p className="text-sm text-muted">{t('home.empty')}</p>
          <Can permission={CorePermission.TasksCreate}><Button asChild size="sm"><Link to="/tasks?new=1"><Plus className="size-4" aria-hidden />{t('newTask')}</Link></Button></Can>
        </div>
      ) : (
        <>
          <ProgressSplit parts={parts} label={t('home.splitLabel')} />
          <ul className="flex flex-col divide-y divide-neutral-200">
            {summary.current.map((task) => (
              <li key={task.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span className="flex min-w-0 flex-col gap-1">
                  <Link to={`/tasks/${task.id}`} className="break-words text-sm font-medium hover:underline">{task.title}</Link>
                  <TaskFlags flags={task.flags} />
                </span>
                <span className="flex items-center gap-2 text-xs text-muted"><span dir="ltr">{task.dueDate}</span><TaskPriorityBadge priority={task.priority} /></span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
