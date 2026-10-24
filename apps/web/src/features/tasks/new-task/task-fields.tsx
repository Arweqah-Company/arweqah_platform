import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';
import { useLiveError, useRules } from '@/shared/lib/live-validation';
import { FormField, Input, Select, Textarea } from '@/shared/ui';
import { PRIORITIES, type TaskDraft } from './task-draft';

interface FieldsProps {
  draft: TaskDraft;
  onPatch: (change: Partial<TaskDraft>) => void;
  today: string;
  /** A task already created may keep an earlier due date. */
  creating: boolean;
}

/** The switch turns red when on (urgent) or petrol (needs review): the same control as the ticket form. */
export function Switch({ on, label, onChange, tone = 'danger' }: { on: boolean; label: string; onChange: (on: boolean) => void; tone?: 'danger' | 'info' }) {
  const { t } = useTranslation('tasks');
  const onClass = tone === 'danger' ? 'border-danger-700 bg-danger-700 text-cream' : 'border-petrol-800 bg-petrol-800 text-cream';
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className={cn('flex h-12 items-center justify-between gap-3 rounded-xl border px-4 text-sm font-medium transition-colors', on ? onClass : 'border-neutral-200 bg-white text-fg')}>
      <span>{label}</span>
      <span className="text-xs font-normal">{on ? t('form.on') : t('form.off')}</span>
    </button>
  );
}

/** Title and description: what the task is. Fields live in their own component so "touched" starts fresh at every opening. */
export function WhatFields({ draft, onPatch }: Pick<FieldsProps, 'draft' | 'onPatch'>) {
  const { t } = useTranslation('tasks');
  const rules = useRules();
  const title = useLiveError(draft.title, rules.text(1));
  return (
    <>
      <FormField label={`${t('form.title')} *`} error={title.error}>
        {(p) => <Input {...p} maxLength={200} aria-required autoFocus onBlur={title.onBlur} value={draft.title} onChange={(e) => onPatch({ title: e.target.value })} />}
      </FormField>
      <FormField label={t('form.description')}>{(p) => <Textarea {...p} rows={4} maxLength={5000} value={draft.description} onChange={(e) => onPatch({ description: e.target.value })} />}</FormField>
    </>
  );
}

/** When, how important, how long. */
export function WhenFields({ draft, onPatch, today, creating }: FieldsProps) {
  const { t } = useTranslation('tasks');
  const rules = useRules();
  const due = useLiveError(draft.dueDate, (v: string) => rules.required(v) ?? (creating && v < today ? t('form.dueInPast') : undefined));
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <FormField label={`${t('form.dueDate')} *`} error={due.error}>
        {(p) => <Input {...p} type="date" dir="ltr" aria-required min={creating ? today : undefined} onBlur={due.onBlur} value={draft.dueDate} onChange={(e) => onPatch({ dueDate: e.target.value })} />}
      </FormField>
      <FormField label={t('form.priority')}>
        {(p) => (
          <Select {...p} value={draft.priority} onChange={(e) => onPatch({ priority: e.target.value as TaskDraft['priority'] })}>
            {PRIORITIES.map((x) => <option key={x} value={x}>{t(`priority.${x}`)}</option>)}
          </Select>
        )}
      </FormField>
      <FormField label={t('form.estimate')} hint={t('form.estimateHint')}>
        {(p) => <Input {...p} type="number" dir="ltr" min={0} step="0.25" value={draft.estimateHours} onChange={(e) => onPatch({ estimateHours: e.target.value })} />}
      </FormField>
    </div>
  );
}

/** Urgent and review switches. */
export function OptionFields({ draft, onPatch }: Pick<FieldsProps, 'draft' | 'onPatch'>) {
  const { t } = useTranslation('tasks');
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5"><span className="text-sm font-medium">{t('form.urgent')}</span><Switch on={draft.urgent} label={t('form.urgentLabel')} onChange={(urgent) => onPatch({ urgent })} /></div>
      <div className="flex flex-col gap-1.5"><span className="text-sm font-medium">{t('form.review')}</span><Switch tone="info" on={draft.needsReview} label={t('form.reviewLabel')} onChange={(needsReview) => onPatch({ needsReview })} /></div>
    </div>
  );
}
