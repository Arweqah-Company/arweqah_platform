import { TASK_STATUSES, type TaskDto, type TaskStatus } from '@arweqah-platform/shared';
import { Archive, Check, Clock, Eye, EyeOff, Pencil, RotateCcw, ThumbsDown, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/lib/error-message';
import { Button, FormField, Select } from '@/shared/ui';
import { useFollow, useRestore } from '../api';
import { TransitionDialogs } from '../board/transition-dialogs';
import { useBoardMove } from '../board/use-board-move';
import { DecisionDialog } from './decision-dialog';
import { EditTaskDialog } from './edit-task-dialog';
import { AnswerDialog, ObjectionDialog } from './objection-dialogs';
import { TimeDialog } from './time-dialog';

type Asking = 'approve' | 'reject' | 'resubmit' | 'object' | 'answer' | 'time' | 'edit';

/** Where the viewer may move the task now (what the API's table of moves allows), as a menu. */
function MoveMenu({ task, today }: { task: TaskDto; today: string }) {
  const { t } = useTranslation('tasks');
  const board = useBoardMove();
  const options = TASK_STATUSES.filter((s) => task.abilities.moveTo.includes(s));
  if (options.length === 0) return null;
  return (
    <>
      <FormField label={t('actions.moveTo')}>
        {(p) => (
          <Select {...p} className="min-w-48" value="" onChange={(e) => e.target.value && board.move(task, e.target.value as TaskStatus)}>
            <option value="">{t('actions.chooseStatus')}</option>
            {options.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
          </Select>
        )}
      </FormField>
      <TransitionDialogs pending={board.pending} busy={board.busy} today={today} onAnswer={board.answer} onCancel={board.cancel} />
    </>
  );
}

/** Follow, restore: one click, no dialog. */
function QuickActions({ task }: { task: TaskDto }) {
  const { t } = useTranslation('tasks');
  const { t: tc } = useTranslation();
  const follow = useFollow(task.id);
  const restore = useRestore(task.id);
  const run = async (action: () => Promise<unknown>, done: string) => {
    try {
      await action();
      toast.success(done);
    } catch (error) {
      toast.error(errorMessage(tc, error));
    }
  };
  return (
    <>
      {task.abilities.follow && (
        <Button variant="secondary" disabled={follow.isPending} onClick={() => void run(() => follow.mutateAsync(!task.isFollowing), t(task.isFollowing ? 'actions.unfollowed' : 'actions.followed'))}>
          {task.isFollowing ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
          {t(task.isFollowing ? 'actions.unfollow' : 'actions.follow')}
        </Button>
      )}
      {task.abilities.restore && <Button disabled={restore.isPending} onClick={() => void run(() => restore.mutateAsync(), t('actions.restored'))}><Archive className="size-4" aria-hidden />{t('actions.restore')}</Button>}
    </>
  );
}

/** The buttons this person may use now; the API decides which, and checks again on every request. */
export function TaskActions({ task, today }: { task: TaskDto; today: string }) {
  const { t } = useTranslation('tasks');
  const [asking, setAsking] = useState<Asking | null>(null);
  const a = task.abilities;
  const dialog = (kind: Asking) => (asking === kind ? () => setAsking(null) : null);
  const close = () => setAsking(null);
  const buttons: { kind: Asking; allowed: boolean; icon: typeof Check; variant: 'primary' | 'secondary' | 'danger' }[] = [
    { kind: 'approve', allowed: a.approve, icon: Check, variant: 'primary' },
    { kind: 'reject', allowed: a.approve, icon: X, variant: 'danger' },
    { kind: 'resubmit', allowed: a.resubmit, icon: RotateCcw, variant: 'primary' },
    { kind: 'object', allowed: a.object, icon: ThumbsDown, variant: 'secondary' },
    { kind: 'answer', allowed: a.answerObjection, icon: Check, variant: 'secondary' },
    { kind: 'time', allowed: a.logTime, icon: Clock, variant: 'secondary' },
    { kind: 'edit', allowed: a.edit, icon: Pencil, variant: 'secondary' },
  ];
  return (
    <div className="flex flex-wrap items-end gap-2">
      <MoveMenu task={task} today={today} />
      {buttons.filter((b) => b.allowed).map(({ kind, icon: Icon, variant }) => <Button key={kind} variant={variant} onClick={() => setAsking(kind)}><Icon className="size-4" aria-hidden />{t(`actions.${kind}`)}</Button>)}
      <QuickActions task={task} />
      {(['approve', 'reject', 'resubmit'] as const).map((kind) => dialog(kind) && <DecisionDialog key={kind} taskId={task.id} revision={task.revision} action={kind} onClose={close} />)}
      {dialog('object') && <ObjectionDialog taskId={task.id} onClose={close} />}
      {dialog('answer') && <AnswerDialog taskId={task.id} currentAssigneeId={task.assignee.id} onClose={close} />}
      {dialog('time') && <TimeDialog taskId={task.id} onClose={close} />}
      {dialog('edit') && <EditTaskDialog task={task} onClose={close} />}
    </div>
  );
}
