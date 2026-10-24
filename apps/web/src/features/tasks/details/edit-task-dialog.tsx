import { riyadhToday, type TaskDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Button, Dialog } from '@/shared/ui';
import { useUpdateTask } from '../api';
import { draftOf, isDraftComplete, toUpdateInput, type TaskDraft } from '../new-task/task-draft';
import { OptionFields, WhatFields, WhenFields } from '../new-task/task-fields';

/** Edits what a task says (not its status, which only moves by the table of moves). */
export function EditTaskDialog({ task, onClose }: { task: TaskDto; onClose: () => void }) {
  const { t } = useTranslation('tasks');
  const { t: tc } = useTranslation();
  const today = riyadhToday();
  const save = useUpdateTask(task.id);
  const [draft, setDraft] = useState<TaskDraft>(() => draftOf(task));
  const patch = (change: Partial<TaskDraft>) => setDraft((d) => ({ ...d, ...change }));
  const submit = async () => {
    try {
      await save.mutateAsync(toUpdateInput(draft, task.revision));
      toast.success(t('edit.saved'));
      onClose();
    } catch {
      /* shown in the dialog */
    }
  };
  return (
    <Dialog open wide onOpenChange={(open) => !open && onClose()} title={t('edit.title')} description={task.number}>
      <div className="flex flex-col gap-4">
        {save.isError && <Alert>{errorMessage(tc, save.error)}</Alert>}
        <WhatFields draft={draft} onPatch={patch} />
        <WhenFields draft={draft} onPatch={patch} today={today} creating={false} />
        <OptionFields draft={draft} onPatch={patch} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>{tc('actions.cancel')}</Button>
          <Button disabled={save.isPending || !isDraftComplete(draft, today, false)} onClick={() => void submit()}>{tc('actions.save')}</Button>
        </div>
      </div>
    </Dialog>
  );
}
