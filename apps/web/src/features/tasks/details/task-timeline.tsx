import type { TaskDto, TaskEventDto } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';

function describe(event: TaskEventDto, t: (key: string, options?: Record<string, unknown>) => string): string {
  const kind = t(`events.${event.type}`);
  if (event.type === 'transitioned' && event.fromStatus && event.toStatus) return `${kind}: ${t(`status.${event.fromStatus}`)} ← ${t(`status.${event.toStatus}`)}`;
  if (event.type === 'objected' && event.note) return `${kind}: ${t(`objection.reason.${event.note}`, { defaultValue: event.note })}`;
  if (event.type === 'time_logged' && event.note) return `${kind}: ${t('events.minutes', { count: Number(event.note) })}`;
  return kind;
}

/** Everything that happened to the task: who, what and when; oldest first. */
export function TaskTimeline({ task }: { task: TaskDto }) {
  const { t, i18n } = useTranslation('tasks');
  return (
    <section aria-label={t('timeline.label')}>
      <ol className="flex flex-col gap-3">
        {task.events.map((e) => (
          <li key={e.id} className="rounded-2xl border border-neutral-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
              <span className="font-medium text-fg">{e.actor?.name ?? t('timeline.system')} <span className="font-normal text-muted">· {describe(e, t)}</span></span>
              <time dateTime={e.createdAt}>{new Date(e.createdAt).toLocaleString(i18n.language)}</time>
            </div>
            {e.note && !['objected', 'time_logged', 'updated'].includes(e.type) && <p className="mt-2 whitespace-pre-wrap text-sm">{e.note}</p>}
          </li>
        ))}
      </ol>
    </section>
  );
}
