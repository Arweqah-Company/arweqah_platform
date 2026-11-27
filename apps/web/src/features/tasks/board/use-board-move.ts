import { CorePermission, type TaskListItemDto, type TaskStatus } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ApiError } from '@/core/api/api-client';
import { usePermissions } from '@/core/permissions/can';
import { errorMessage } from '@/shared/lib/error-message';
import { useMoveTask } from '../api';

export interface PendingMove {
  task: TaskListItemDto;
  to: TaskStatus;
  /** What is asked before the task moves: a note, the real completion date (both asked by the API), or the delivery files (offered when the work is finished). */
  needs: 'note' | 'date' | 'files';
  /** What the person already gave (the delivery files), sent again with the next answer. */
  carry?: MoveExtra;
}

export interface MoveExtra {
  note?: string;
  completedOn?: string;
  fileIds?: string[];
}

/** The moves that finish the work: the doer may hand in delivery files with them. */
const FINISHES: TaskStatus[] = ['done', 'awaiting_review'];

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
  const { can } = usePermissions();

  const refusal = (error: unknown): string => {
    const reason = error instanceof ApiError && error.code === 'TASK_TRANSITION_NOT_ALLOWED' ? (error.details as { reason?: string } | undefined)?.reason : undefined;
    return reason ? t(`moveReason.${reason}`, { defaultValue: errorMessage(tc, error) }) : errorMessage(tc, error);
  };

  const run = async (task: TaskListItemDto, to: TaskStatus, extra: MoveExtra = {}): Promise<void> => {
    setPlaced((p) => ({ ...p, [task.id]: to }));
    try {
      await transition.mutateAsync({ id: task.id, to, revision: task.revision, ...extra });
      setPending(null);
    } catch (error) {
      const code = error instanceof ApiError ? error.code : '';
      if (code === 'TASK_NOTE_REQUIRED') setPending({ task, to, needs: 'note', carry: extra });
      else if (code === 'TASK_COMPLETION_DATE_REQUIRED') setPending({ task, to, needs: 'date', carry: extra });
      else toast.error(refusal(error));
    } finally {
      setPlaced(({ [task.id]: _gone, ...rest }) => rest);
    }
  };

  return {
    statusOf: (task: TaskListItemDto): TaskStatus => placed[task.id] ?? task.status,
    move: (task: TaskListItemDto, to: TaskStatus) => {
      if (task.status === to) return;
      if (task.status === 'in_progress' && FINISHES.includes(to) && can(CorePermission.TasksFileDeliver)) setPending({ task, to, needs: 'files' });
      else void run(task, to);
    },
    pending,
    answer: (extra: MoveExtra) => (pending ? run(pending.task, pending.to, { ...pending.carry, ...extra }) : Promise.resolve()),
    cancel: () => setPending(null),
    busy: transition.isPending,
  };
}
