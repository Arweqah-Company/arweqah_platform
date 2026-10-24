import type { MatrixQuadrant, TaskListItemDto } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Avatar } from '../board/task-card';
import { TaskFlags } from '../task-badges';

/** One of the four squares: its question, its count, and its tasks. */
export function MatrixQuadrantPanel({ id, total, items }: { id: MatrixQuadrant; total: number; items: TaskListItemDto[] }) {
  const { t } = useTranslation('tasks');
  return (
    <section aria-labelledby={`quadrant-${id}`} className="flex flex-col gap-3 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm shadow-ink/5">
      <header>
        <h2 id={`quadrant-${id}`} className="flex items-center justify-between gap-2 text-base font-bold">
          <span>{t(`matrix.${id}.title`)}</span>
          <span className="rounded-full bg-neutral-50 px-2.5 py-0.5 text-xs text-muted" dir="ltr">{total}</span>
        </h2>
        <p className="text-xs text-muted">{t(`matrix.${id}.hint`)}</p>
      </header>
      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">{t('matrix.empty')}</p>
      ) : (
        <ul className="flex max-h-96 flex-col gap-2 overflow-y-auto" tabIndex={0} aria-label={t(`matrix.${id}.title`)}>
          {items.map((task) => (
            <li key={task.id} className="flex items-start gap-2 rounded-2xl bg-neutral-50 p-3">
              <Avatar name={task.assignee.name} />
              <div className="min-w-0 flex-1">
                <Link to={`/tasks/${task.id}`} className="block break-words text-sm font-medium hover:underline">{task.title}</Link>
                <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted"><span dir="ltr">{task.dueDate}</span><TaskFlags flags={task.flags} /></p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
