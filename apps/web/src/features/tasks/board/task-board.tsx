import { TASK_STATUSES, type TaskListItemDto } from '@arweqah-platform/shared';
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BoardColumn } from './board-column';
import { CardBody } from './task-card';
import { TransitionDialogs } from './transition-dialogs';
import { useBoardMove } from './use-board-move';

export interface BoardLane {
  id: string;
  /** Shown above the lane (the person, in the team page's swimlanes). */
  label?: string;
  tasks: TaskListItemDto[];
}

/** Dropping on a column is asking for that status; the lane (a person's row) only groups cards. */
const targetStatus = (event: DragEndEvent) => String(event.over?.id ?? '').split('|')[1];

/**
 * The Kanban board: a column for every status, a card for every task, one row (lane) or one row per person.
 * Moving a card, by drag or by its menu, goes through the API's table of moves; the board never decides.
 */
export function TaskBoard({ lanes, today }: { lanes: BoardLane[]; today: string }) {
  const { t } = useTranslation('tasks');
  const board = useBoardMove();
  const [dragged, setDragged] = useState<TaskListItemDto | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor));
  const onEnd = (event: DragEndEvent) => {
    setDragged(null);
    const to = targetStatus(event);
    const task = lanes.flatMap((l) => l.tasks).find((x) => x.id === event.active.id);
    if (task && to && (TASK_STATUSES as readonly string[]).includes(to)) board.move(task, to as (typeof TASK_STATUSES)[number]);
  };
  return (
    <DndContext sensors={sensors} onDragStart={(e) => setDragged(lanes.flatMap((l) => l.tasks).find((x) => x.id === e.active.id) ?? null)} onDragEnd={onEnd} onDragCancel={() => setDragged(null)}>
      <div className="flex flex-col gap-6" role="group" aria-label={t('board.label')}>
        {lanes.map((lane) => (
          <div key={lane.id} className="flex flex-col gap-2">
            {lane.label && <h3 className="text-sm font-bold">{lane.label}</h3>}
            <div className="flex gap-3 overflow-x-auto pb-2" tabIndex={0} role="region" aria-label={lane.label ?? t('board.label')}>
              {TASK_STATUSES.map((status) => (
                <BoardColumn key={status} laneId={lane.id} status={status} tasks={lane.tasks.filter((x) => board.statusOf(x) === status)} statusOf={board.statusOf} onMove={board.move} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <DragOverlay>{dragged && <div className="w-72 rounded-2xl border border-link bg-white p-3 shadow-lg"><CardBody task={dragged} /></div>}</DragOverlay>
      <TransitionDialogs pending={board.pending} busy={board.busy} today={today} onAnswer={board.answer} onCancel={board.cancel} />
    </DndContext>
  );
}
