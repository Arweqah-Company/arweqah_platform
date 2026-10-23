import { MAX_TICKET_FILES, MAX_TICKET_TEXT } from '@arweqah-platform/shared';
import { ArrowRight } from 'lucide-react';
import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveError, useRules } from '@/shared/lib/live-validation';
import { cn } from '@/shared/lib/cn';
import { Alert, Button, FileAttachments, FormField, Input, Textarea } from '@/shared/ui';
import { datesFor, type Choice, type Draft } from './use-new-ticket';

interface Props {
  choice: Choice;
  draft: Draft;
  today: string;
  busy: boolean;
  error: string | null;
  onPatch: (change: Partial<Draft>) => void;
  onBack: () => void;
  onSubmit: () => void;
}

/** The urgent switch turns red when it is on. */
function UrgentSwitch({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
  const { t } = useTranslation('tickets');
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className={cn('flex h-12 items-center justify-between gap-3 rounded-xl border px-4 text-sm font-medium transition-colors', on ? 'border-danger-700 bg-danger-700 text-cream' : 'border-neutral-200 bg-white text-fg')}>
      <span>{t('details.urgent')}</span>
      <span className="text-xs font-normal">{on ? t('details.urgentOn') : t('details.urgentOff')}</span>
    </button>
  );
}

function SummaryBar({ choice, onBack }: { choice: Choice; onBack: () => void }) {
  const { t, i18n } = useTranslation('tickets');
  const ar = i18n.language === 'ar';
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-petrol-50 p-3 text-sm">
      <span className="flex flex-col"><span className="font-bold">{ar ? choice.type.nameAr : choice.type.nameEn}</span><span className="text-xs text-muted">{ar ? choice.desk.nameAr : choice.desk.nameEn}{choice.type.assignee ? ` · ${t('details.handledBy', { name: choice.type.assignee.name })}` : ''}</span></span>
      <Button variant="secondary" size="sm" onClick={onBack}><ArrowRight className="size-4 rtl:rotate-0 ltr:rotate-180" aria-hidden />{t('details.change')}</Button>
    </div>
  );
}

/** Step 2: the ticket itself. Ctrl+Enter sends; "Change" goes back to step 1 without losing what was typed. */
export function DetailsStep({ choice, draft, today, busy, error, onPatch, onBack, onSubmit }: Props) {
  const { t } = useTranslation('tickets');
  const rules = useRules();
  const { earliest } = datesFor(choice, today);
  const [tried, setTried] = useState(false);
  const title = useLiveError(draft.title, rules.text(1));
  const needed = useLiveError(draft.neededBy, (v: string) => rules.required(v) ?? (v < earliest ? t('details.tooEarly', { date: earliest }) : undefined));
  const valid = draft.title.trim().length > 0 && draft.neededBy >= earliest;
  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    setTried(true);
    if (valid && !busy) onSubmit();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) submit();
  };
  return (
    <form className="flex flex-col gap-4" onSubmit={submit} onKeyDown={onKeyDown} noValidate>
      <SummaryBar choice={choice} onBack={onBack} />
      {error && <Alert>{error}</Alert>}
      <FormField label={`${t('details.title')} *`} error={title.error ?? (tried && !draft.title.trim() ? t('details.titleRequired') : undefined)}>
        {(p) => <Input {...p} maxLength={200} aria-required onBlur={title.onBlur} value={draft.title} onChange={(e) => onPatch({ title: e.target.value })} autoFocus />}
      </FormField>
      <FormField label={t('details.text')}>{(p) => <Textarea {...p} rows={5} maxLength={MAX_TICKET_TEXT} value={draft.details} onChange={(e) => onPatch({ details: e.target.value })} />}</FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={`${t('details.neededBy')} *`} hint={t('details.neededByHint', { count: choice.type.dueDays })} error={needed.error}>
          {(p) => <Input {...p} type="date" dir="ltr" min={earliest} onBlur={needed.onBlur} value={draft.neededBy} onChange={(e) => onPatch({ neededBy: e.target.value })} />}
        </FormField>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">{t('details.priority')}</span>
          <UrgentSwitch on={draft.urgent} onChange={(urgent) => onPatch({ urgent })} />
        </div>
      </div>
      <FileAttachments files={draft.files} onChange={(files) => onPatch({ files })} max={MAX_TICKET_FILES} label={t('details.attachments')} />
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-muted">{t('details.shortcut')}</span>
        <Button type="submit" disabled={busy || !valid}>{t('details.send')}</Button>
      </div>
    </form>
  );
}
