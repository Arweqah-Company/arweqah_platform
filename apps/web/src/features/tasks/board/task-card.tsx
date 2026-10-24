import { TASK_STATUSES, type TaskListItemDto, type TaskStatus } from '@arweqah-platform/shared';
import { useDraggable } from '@dnd-kit/core';
import { GripVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { cn } from '@/shared/lib/cn';
import { TaskFlags, TaskPriorityBadge } from '../task-badges';

/** Cards that wait for somebody's decision, or were refused, are not moved by hand. */
export const isFixed = (status: TaskStatus): boolean => status === 'pending_approval' || status === 'rejected';

const MOVE_TARGETS = TASK_STATUSES.filter((s) => !isFixed(s));

export function Avatar({ name }: { name: string }) {
  return <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full bg-petrol-800 text-xs font-bold text-cream">{name.trim().charAt(0)}</span>;
}

/** What a card shows: who, what, when, how important, which tag, and the marks (urgent, overdue, stale, objected to). */
export function CardBody({ task }: { task: TaskListItemDto }) {
  const { i18n } = useTranslation('tasks');
  return (
    <>
      <div className="flex items-start gap-2">
        <Avatar name={task.assignee.name} />
        <div className="min-w-0 flex-1">
          <Link to={`/tasks/${task.id}`} className="block break-words text-sm font-medium hover:underline">{task.title}</Link>
          <p className="text-xs text-muted">{task.assignee.name}</p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
        <span dir="ltr" className="text-muted">{task.dueDate}</span>
        <TaskPriorityBadge priority={task.priority} />
        {task.tag && <span className="rounded-full bg-neutral-50 px-2 py-0.5 text-fg">{i18n.language === 'ar' ? task.tag.nameAr : task.tag.nameEn}</span>}
      </div>
      <div className="mt-2"><TaskFlags flags={task.flags} /></div>
    </>
  );
}

/** A card that can be dragged by its handle (so the title link and the move menu stay clickable, and a phone can still scroll the board). */
export function TaskCard({ task, status, onMove }: { task: TaskListItemDto; status: TaskStatus; onMove: (task: TaskListItemDto, to: TaskStatus) => void }) {
  const { t } = useTranslation('tasks');
  const fixed = isFixed(status);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id, disabled: fixed });
  return (
    <li ref={setNodeRef} className={cn('rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm shadow-ink/5', isDragging && 'opacity-40')}>
      <CardBody task={task} />
      {!fixed && (
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-neutral-200 pt-2">
          <button type="button" aria-label={t('board.drag', { title: task.title })} className="grid size-9 touch-none place-items-center rounded-lg text-muted hover:bg-neutral-50 hover:text-fg" {...attributes} {...listeners}>
            <GripVertical className="size-4" aria-hidden />
          </button>
          <select aria-label={t('board.moveTo', { title: task.title })} value={status} onChange={(e) => onMove(task, e.target.value as TaskStatus)} className="h-9 min-w-0 flex-1 rounded-lg border border-neutral-200 bg-white px-2 text-xs text-fg">
            {MOVE_TARGETS.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
          </select>
        </div>
      )}
    </li>
  );
}
