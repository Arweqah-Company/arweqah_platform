import { riyadhToday, type TaskDto } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, PageHeader } from '@/shared/ui';
import { useTask } from '../api';
import { TaskFlags, TaskPriorityBadge, TaskStatusBadge } from '../task-badges';
import { TaskActions } from './task-actions';
import { TaskFacts } from './task-facts';
import { TaskTimeline } from './task-timeline';

function Notes({ task }: { task: TaskDto }) {
  const { t, i18n } = useTranslation('tasks');
  return (
    <>
      {task.archivedAt && <Alert tone="info">{t('details.archivedNote', { date: new Date(task.archivedAt).toLocaleDateString(i18n.language) })}</Alert>}
      {task.objection && <Alert tone="warning">{t('details.objectionNote', { name: task.objection.raisedBy.name, reason: t(`objection.reason.${task.objection.reason}`), date: new Date(task.objection.expiresAt).toLocaleDateString(i18n.language) })}</Alert>}
      {task.status === 'pending_approval' && <Alert tone="info">{t('details.pendingNote', { name: task.approver?.name ?? '' })}</Alert>}
      {task.description && <p className="whitespace-pre-wrap rounded-2xl border border-neutral-200 bg-white p-4 text-sm">{task.description}</p>}
    </>
  );
}

/** One task: what it is, who and when, what I may do with it, and everything that happened to it. */
export function TaskDetailsPage() {
  const { t } = useTranslation('tasks');
  const { t: tc } = useTranslation();
  const { id } = useParams();
  const query = useTask(id);
  if (query.isError) return <Alert>{errorMessage(tc, query.error)}</Alert>;
  const task = query.data;
  if (!task) return <p role="status" className="text-sm text-muted">{t('loading')}</p>;
  return (
    <>
      <PageHeader title={`${task.number} · ${task.title}`} description={t('details.pageHint')} />
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2"><TaskStatusBadge status={task.status} /><TaskPriorityBadge priority={task.priority} /><TaskFlags flags={task.flags} /></div>
        <Notes task={task} />
        <TaskFacts task={task} />
        <TaskActions task={task} today={riyadhToday()} />
        <TaskTimeline task={task} />
      </div>
    </>
  );
}
