import { riyadhToday, type TaskTagDto } from '@arweqah-platform/shared';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Button, Dialog, FormField, Input, Select } from '@/shared/ui';
import { useCreateTask, useTaskOptions } from '../api';
import { ApproverHint } from './approver-hint';
import { emptyDraft, isDraftComplete, toCreateInput, type TaskDraft } from './task-draft';
import { OptionFields, WhatFields, WhenFields } from './task-fields';

function TagSelect({ tags, value, onChange }: { tags: TaskTagDto[]; value: string; onChange: (value: string) => void }) {
  const { t, i18n } = useTranslation('tasks');
  return (
    <FormField label={t('form.tag')} hint={tags.length === 0 ? t('form.noTags') : undefined}>
      {(p) => (
        <Select {...p} value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">{t('form.noTag')}</option>
          {tags.map((x) => <option key={x.id} value={x.id}>{i18n.language === 'ar' ? x.nameAr : x.nameEn}</option>)}
        </Select>
      )}
    </FormField>
  );
}

/** Who gets the task and how it repeats. */
function WhoFields({ draft, onPatch, options }: { draft: TaskDraft; onPatch: (change: Partial<TaskDraft>) => void; options: ReturnType<typeof useTaskOptions>['data'] }) {
  const { t } = useTranslation('tasks');
  const me = options?.assignees.find((a) => a.isSelf);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField label={t('form.assignee')} hint={t('form.assigneeHint')}>
        {(p) => (
          <Select {...p} value={draft.assigneeUserId || me?.id || ''} onChange={(e) => onPatch({ assigneeUserId: e.target.value === me?.id ? '' : e.target.value })}>
            {(options?.assignees ?? []).map((a) => <option key={a.id} value={a.id}>{a.isSelf ? t('form.me', { name: a.name }) : a.name}</option>)}
          </Select>
        )}
      </FormField>
      <TagSelect tags={options?.tags ?? []} value={draft.tagId} onChange={(tagId) => onPatch({ tagId })} />
      <FormField label={t('form.recurrence')}>
        {(p) => (
          <Select {...p} value={draft.recurrence} onChange={(e) => onPatch({ recurrence: e.target.value as TaskDraft['recurrence'] })}>
            {(['none', 'daily', 'weekly', 'monthly'] as const).map((x) => <option key={x} value={x}>{t(`recurrence.${x}`)}</option>)}
          </Select>
        )}
      </FormField>
      {draft.recurrence !== 'none' && (
        <FormField label={t('form.recurrenceEnd')} hint={t('form.recurrenceEndHint')}>
          {(p) => <Input {...p} type="date" dir="ltr" min={draft.dueDate} value={draft.recurrenceEnd} onChange={(e) => onPatch({ recurrenceEnd: e.target.value })} />}
        </FormField>
      )}
    </div>
  );
}

/** The form: the title, who gets it (me by default), when (today), how important (medium), how long, a tag and whether it repeats. It starts fresh at every opening. */
function NewTaskForm({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation('tasks');
  const { t: tc } = useTranslation();
  const today = riyadhToday();
  const [draft, setDraft] = useState<TaskDraft>(() => emptyDraft(today));
  const options = useTaskOptions().data;
  const create = useCreateTask();
  const patch = (change: Partial<TaskDraft>) => setDraft((d) => ({ ...d, ...change }));
  const forMyself = !draft.assigneeUserId || draft.assigneeUserId === options?.assignees.find((a) => a.isSelf)?.id;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await create.mutateAsync(toCreateInput(draft));
      toast.success(t('form.created'));
      onDone();
    } catch {
      /* shown above the form */
    }
  };
  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => void submit(e)} noValidate>
      {create.isError && <Alert>{errorMessage(tc, create.error)}</Alert>}
      <WhatFields draft={draft} onPatch={patch} />
      <WhoFields draft={draft} onPatch={patch} options={options} />
      <WhenFields draft={draft} onPatch={patch} today={today} creating />
      <OptionFields draft={draft} onPatch={patch} />
      <ApproverHint forMyself={forMyself} approver={options?.approver ?? null} />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onDone}>{tc('actions.cancel')}</Button>
        <Button type="submit" disabled={create.isPending || !isDraftComplete(draft, today, true)}>{t('form.create')}</Button>
      </div>
    </form>
  );
}

/** A new task, in a popup over the list. */
export function NewTaskDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation('tasks');
  return (
    <Dialog open={open} onOpenChange={onOpenChange} wide title={t('form.newTitle')} description={t('form.newDescription')}>
      <NewTaskForm onDone={() => onOpenChange(false)} />
    </Dialog>
  );
}
