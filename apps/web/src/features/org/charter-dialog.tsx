import { CHARTER_ITEM_MAX_LENGTH, CHARTER_LIST_MAX_ITEMS, CHARTER_TEXT_MAX_LENGTH, EMPTY_CHARTER, type OrgCharter } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/lib/error-message';
import { listProblem, todayInRiyadh } from '@/shared/lib/lines';
import { useLiveError, useRules } from '@/shared/lib/live-validation';
import { Alert, Button, Dialog, DialogFooter, FormField, Input, LocalizedLinesField, Textarea } from '@/shared/ui';
import { useUpdateCharter } from './api';
import { nodeName, type OrgNode } from './org-model';
import { REASON_MIN } from './leader-rules';

const LISTS = ['outputs', 'inScope', 'outOfScope', 'limits'] as const;
const LIMITS = { maxItems: CHARTER_LIST_MAX_ITEMS, maxLength: CHARTER_ITEM_MAX_LENGTH };

/** Whether every list of the charter is within the limits of the contract. */
export const charterListsValid = (charter: OrgCharter): boolean => LISTS.every((k) => !listProblem(charter[k].ar, LIMITS) && !listProblem(charter[k].en, LIMITS));

function PurposeField({ charter, onChange }: { charter: OrgCharter; onChange: (next: OrgCharter) => void }) {
  const { t } = useTranslation('org');
  const { t: tc } = useTranslation();
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium">{t('charter.purpose')}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {(['ar', 'en'] as const).map((lang) => (
          <div key={lang} className="flex flex-col gap-1">
            <label htmlFor={`purpose-${lang}`} className="text-xs text-muted">{tc(`language.${lang}`)}</label>
            <Textarea id={`purpose-${lang}`} rows={3} maxLength={CHARTER_TEXT_MAX_LENGTH} dir={lang === 'ar' ? 'rtl' : 'ltr'} aria-label={`${t('charter.purpose')}: ${tc(`language.${lang}`)}`} value={charter.purpose[lang]} onChange={(e) => onChange({ ...charter, purpose: { ...charter.purpose, [lang]: e.target.value } })} />
          </div>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Writing or changing the charter of a unit. The change takes effect today or on a later day (a later day is a scheduled version the nightly job applies),
 * and it always carries a reason, which goes to the history and the audit log.
 */
export function CharterDialog({ node, charter, onClose }: { node: OrgNode; charter: OrgCharter | null; onClose: () => void }) {
  const { t, i18n } = useTranslation('org');
  const { t: tc } = useTranslation();
  const rules = useRules();
  const today = todayInRiyadh();
  const [draft, setDraft] = useState<OrgCharter>(charter ?? EMPTY_CHARTER);
  const [effectiveFrom, setEffectiveFrom] = useState(today);
  const [reason, setReason] = useState('');
  const save = useUpdateCharter(node.id);
  const reasonError = useLiveError(reason, rules.text(REASON_MIN));
  const dateError = useLiveError(effectiveFrom, (v: string) => (!v ? t('charter.errors.dateRequired') : v < today ? t('charter.errors.datePast') : undefined));
  const valid = effectiveFrom >= today && reason.trim().length >= REASON_MIN && charterListsValid(draft);
  const submit = async () => {
    try {
      await save.mutateAsync({ ...draft, effectiveFrom, reason: reason.trim() });
      toast.success(effectiveFrom > today ? t('charter.savedScheduled', { date: effectiveFrom }) : t('charter.saved'));
      onClose();
    } catch {
      /* shown inside the dialog */
    }
  };
  return (
    <Dialog open wide onOpenChange={(open) => !open && onClose()} title={t('charter.dialogTitle')} description={nodeName(node, i18n.language === 'ar')}>
      <div className="flex flex-col gap-5">
        {save.isError && <Alert>{errorMessage(tc, save.error)}</Alert>}
        <PurposeField charter={draft} onChange={setDraft} />
        {LISTS.map((key) => <LocalizedLinesField key={key} label={t(`charter.${key}`)} hint={t('charter.linesHint')} value={draft[key]} onChange={(next) => setDraft({ ...draft, [key]: next })} {...LIMITS} />)}
        <FormField label={`${t('charter.effectiveFrom')} *`} hint={t('charter.effectiveHint')} error={dateError.error}>{(p) => <Input {...p} type="date" dir="ltr" min={today} onBlur={dateError.onBlur} value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />}</FormField>
        <FormField label={`${t('charter.reason')} *`} error={reasonError.error}>{(p) => <Textarea {...p} rows={2} onBlur={reasonError.onBlur} value={reason} onChange={(e) => setReason(e.target.value)} />}</FormField>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>{tc('actions.cancel')}</Button>
          <Button disabled={!valid || save.isPending} onClick={() => void submit()}>{tc('actions.save')}</Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}
