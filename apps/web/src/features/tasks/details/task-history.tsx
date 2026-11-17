import type { TaskDto, TaskEventDto, TaskEventType } from '@arweqah-platform/shared';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge, HistoryActor, HistorySection, HistoryWhen, type Column } from '@/shared/ui';
import { TaskStatusBadge } from '../task-badges';

type EventTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

const EVENT_TONE: Record<TaskEventType, EventTone> = {
  created: 'info',
  updated: 'neutral',
  transitioned: 'info',
  approved: 'success',
  rejected: 'danger',
  resubmitted: 'info',
  objected: 'warning',
  objection_answered: 'info',
  objection_expired: 'neutral',
  archived: 'neutral',
  restored: 'success',
  handed_over: 'neutral',
  time_logged: 'neutral',
  reassigned: 'neutral',
};

/** What the event says beyond its name: the two statuses of a change, the reason of an objection, the minutes of a time entry, or the note. */
function Detail({ event }: { event: TaskEventDto }) {
  const { t } = useTranslation('tasks');
  if (event.type === 'transitioned' && event.fromStatus && event.toStatus) {
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        <TaskStatusBadge status={event.fromStatus} />
        <ArrowRight className="size-3.5 text-muted rtl:rotate-180" aria-label={t('history.to')} role="img" />
        <TaskStatusBadge status={event.toStatus} />
      </span>
    );
  }
  if (!event.note) return <span className="text-muted">—</span>;
  if (event.type === 'objected') return <>{t(`objection.reason.${event.note}`, { defaultValue: event.note })}</>;
  if (event.type === 'time_logged') return <>{t('events.minutes', { count: Number(event.note) })}</>;
  return <span className="whitespace-pre-wrap">{event.note}</span>;
}

function useColumns(events: TaskEventDto[]): Column<TaskEventDto>[] {
  const { t } = useTranslation('tasks');
  const number = new Map(events.map((e, i) => [e.id, i + 1]));
  return [
    { id: 'n', header: '#', cell: (e) => number.get(e.id), className: 'w-10 tabular-nums text-muted' },
    { id: 'when', header: t('history.when'), cell: (e) => <HistoryWhen at={e.createdAt} /> },
    { id: 'who', header: t('history.who'), cell: (e) => <HistoryActor name={e.actor?.name ?? null} systemLabel={t('timeline.system')} /> },
    { id: 'what', header: t('history.what'), cell: (e) => <Badge tone={EVENT_TONE[e.type]}>{t(`events.${e.type}`)}</Badge> },
    { id: 'detail', header: t('history.detail'), cell: (e) => <Detail event={e} /> },
  ];
}

/** Everything that happened to the task (who, what, when), oldest first, opened from a button as a table. */
export function TaskHistory({ task }: { task: TaskDto }) {
  const { t } = useTranslation('tasks');
  const columns = useColumns(task.events);
  return <HistorySection title={t('timeline.label')} description={`${task.number} · ${task.title}`} countText={t('history.count', { count: task.events.length })} openLabel={t('history.open')} rows={task.events} rowKey={(e) => e.id} columns={columns} />;
}
