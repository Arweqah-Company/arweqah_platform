import type { TaskListItemDto, TaskStatus } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ApiError } from '@/core/api/api-client';
import { errorMessage } from '@/shared/lib/error-message';
import { useMoveTask } from '../api';

export interface PendingMove {
  task: TaskListItemDto;
  to: TaskStatus;
  /** What the API asked for before it can move the task. */
  needs: 'note' | 'date';
}

/**
 * Moving a card is a request to the API, which decides by the table of moves; the card shows its new place at once and goes back
 * with the reason when the API refuses. A move that needs a note (sending work back) or the real completion date asks for it first.
 */
export function useBoardMove() {
  const { t } = useTranslation('tasks');
  const { t: tc } = useTranslation();
  const transition = useMoveTask();
  const [placed, setPlaced] = useState<Record<string, TaskStatus>>({});
  const [pending, setPending] = useState<PendingMove | null>(null);

  const refusal = (error: unknown): string => {
    const reason = error instanceof ApiError && error.code === 'TASK_TRANSITION_NOT_ALLOWED' ? (error.details as { reason?: string } | undefined)?.reason : undefined;
    return reason ? t(`moveReason.${reason}`, { defaultValue: errorMessage(tc, error) }) : errorMessage(tc, error);
  };

  const run = async (task: TaskListItemDto, to: TaskStatus, extra: { note?: string; completedOn?: string } = {}): Promise<void> => {
    setPlaced((p) => ({ ...p, [task.id]: to }));
    try {
      await transition.mutateAsync({ id: task.id, to, revision: task.revision, ...extra });
      setPending(null);
    } catch (error) {
      const code = error instanceof ApiError ? error.code : '';
      if (code === 'TASK_NOTE_REQUIRED') setPending({ task, to, needs: 'note' });
      else if (code === 'TASK_COMPLETION_DATE_REQUIRED') setPending({ task, to, needs: 'date' });
      else toast.error(refusal(error));
    } finally {
      setPlaced(({ [task.id]: _gone, ...rest }) => rest);
    }
  };

  return {
    statusOf: (task: TaskListItemDto): TaskStatus => placed[task.id] ?? task.status,
    move: (task: TaskListItemDto, to: TaskStatus) => (task.status === to ? undefined : void run(task, to)),
    pending,
    answer: (extra: { note?: string; completedOn?: string }) => (pending ? run(pending.task, pending.to, extra) : Promise.resolve()),
    cancel: () => setPending(null),
    busy: transition.isPending,
  };
}
