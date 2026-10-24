import type { TaskListItemDto, TaskStatus } from '@arweqah-platform/shared';
import { useDroppable } from '@dnd-kit/core';
import { useTranslation } from 'react-i18next';
import { KanbanColumn } from '@/shared/ui';
import { TaskCard } from './task-card';

interface Props {
  laneId: string;
  status: TaskStatus;
  tasks: TaskListItemDto[];
  statusOf: (task: TaskListItemDto) => TaskStatus;
  onMove: (task: TaskListItemDto, to: TaskStatus) => void;
}

/** One status of the board: a drop target with its count. On a phone the columns keep their width and the board scrolls sideways. */
export function BoardColumn({ laneId, status, tasks, statusOf, onMove }: Props) {
  const { t } = useTranslation('tasks');
  const { setNodeRef, isOver } = useDroppable({ id: `${laneId}|${status}` });
  return (
    <KanbanColumn columnRef={setNodeRef} title={t(`status.${status}`)} count={tasks.length} highlighted={isOver}>
      {tasks.map((task) => <TaskCard key={task.id} task={task} status={statusOf(task)} onMove={onMove} />)}
    </KanbanColumn>
  );
}
