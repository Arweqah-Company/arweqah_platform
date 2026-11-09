import { FISCAL_KINDS, FISCAL_MONTH_NAMES, fiscalEditProblems, fiscalInputSchema, type FiscalCard } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { removeAt, replaceAt } from '@/shared/lib/array-edit';
import { Alert, Dialog, EditorBlock, EditorRow, FormField, Select, Textarea } from '@/shared/ui';
import { useSaveFiscal } from './api';
import { EditorFooter } from './editor-footer';

interface FiscalDraft {
  months: { month: string; kind: string }[];
  notes: { month: string; text: string }[];
}

const KIND_KEY: Record<string, string> = { [FISCAL_KINDS[0]]: 'milestone', [FISCAL_KINDS[1]]: 'daily' };
const blank = (): FiscalDraft => ({ months: FISCAL_MONTH_NAMES.map((month) => ({ month, kind: FISCAL_KINDS[1] })), notes: [] });
const draftOf = (card: FiscalCard | null): FiscalDraft => (card?.months.length ? { months: FISCAL_MONTH_NAMES.map((month) => ({ month, kind: card.months.find((m) => m.month === month)?.kind ?? FISCAL_KINDS[1] })), notes: card.notes.map((n) => ({ ...n })) } : blank());

/** The months with their kinds: each of the twelve is a milestone or a month of daily follow-up. */
function MonthsBlock({ draft, onChange }: { draft: FiscalDraft; onChange: (next: FiscalDraft) => void }) {
  const { t } = useTranslation('performance');
  return (
    <EditorBlock title={t('editor.fiscal.months')} hint={t('editor.fiscal.monthsHint')}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {draft.months.map((m, i) => (
          <FormField key={m.month} label={m.month}>{(p) => <Select {...p} value={m.kind} onChange={(e) => onChange({ ...draft, months: replaceAt(draft.months, i, { ...m, kind: e.target.value }) })}>{FISCAL_KINDS.map((k) => <option key={k} value={k}>{t(`editor.fiscal.kinds.${KIND_KEY[k]}`)}</option>)}</Select>}</FormField>
        ))}
      </div>
    </EditorBlock>
  );
}

/** The notes of the card: a month (or «months without a milestone», as the file wrote it) and the text. */
function NotesBlock({ draft, onChange }: { draft: FiscalDraft; onChange: (next: FiscalDraft) => void }) {
  const { t } = useTranslation('performance');
  const names = (own: string) => [...FISCAL_MONTH_NAMES, ...(FISCAL_MONTH_NAMES.includes(own as never) || !own ? [] : [own])];
  return (
    <EditorBlock title={t('editor.fiscal.notes')} onAdd={() => onChange({ ...draft, notes: [...draft.notes, { month: FISCAL_MONTH_NAMES[0], text: '' }] })} addLabel={t('editor.fiscal.addNote')}>
      {draft.notes.map((n, i) => (
        <EditorRow key={i} onRemove={() => onChange({ ...draft, notes: removeAt(draft.notes, i) })} removeLabel={t('editor.remove')}>
          <FormField label={t('editor.fiscal.noteMonth')}>{(p) => <Select {...p} value={n.month} onChange={(e) => onChange({ ...draft, notes: replaceAt(draft.notes, i, { ...n, month: e.target.value }) })}>{names(n.month).map((m) => <option key={m} value={m}>{m}</option>)}</Select>}</FormField>
          <FormField label={t('editor.fiscal.noteText')}>{(p) => <Textarea {...p} aria-required rows={2} maxLength={600} value={n.text} onChange={(e) => onChange({ ...draft, notes: replaceAt(draft.notes, i, { ...n, text: e.target.value }) })} />}</FormField>
        </EditorRow>
      ))}
    </EditorBlock>
  );
}

/** The fiscal-year card: the twelve months with their kind, and the notes. */
export function FiscalEditorDialog({ card, onClose }: { card: FiscalCard | null; onClose: () => void }) {
  const { t } = useTranslation('performance');
  const save = useSaveFiscal();
  const initial = draftOf(card);
  const [draft, setDraft] = useState(initial);
  const [tried, setTried] = useState(false);
  const parsed = fiscalInputSchema.safeParse(draft);
  const ok = parsed.success && fiscalEditProblems(parsed.data.months).length === 0;
  const submit = () => {
    setTried(true);
    if (parsed.success && ok) save.mutate(parsed.data, { onSuccess: () => { toast.success(t('editor.fiscal.saved')); onClose(); } });
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t('editor.fiscal.title')} description={t('editor.fiscal.description')} xl>
      <div className="flex flex-col gap-4">
        <MonthsBlock draft={draft} onChange={setDraft} />
        <NotesBlock draft={draft} onChange={setDraft} />
        {(tried || JSON.stringify(draft) !== JSON.stringify(initial)) && !ok && <Alert tone="warning">{t('editor.complete')}</Alert>}
        {save.isError && <Alert tone="danger">{t('editor.saveFailed')}</Alert>}
      </div>
      <EditorFooter saving={save.isPending} onSave={submit} onCancel={onClose} />
    </Dialog>
  );
}
