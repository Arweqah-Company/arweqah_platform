import { OBJECTION_REASON_MIN, type MyResultDto, type ObjectionKind } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Alert, Button, Dialog, DialogFooter, FormField, Select, Textarea } from '@/shared/ui';
import { useRaiseObjection } from './api';

interface Item { value: string; kind: ObjectionKind; ref: string; label: string }

/** The things an objection can name: each results criterion, each behaviour, and the three parts of the extra component. */
function useItems(result: MyResultDto): Item[] {
  const { t } = useTranslation('performance');
  return [
    ...result.template.criteria.map((c, i) => ({ value: `criterion:${i}`, kind: 'criterion' as const, ref: String(i), label: `${t('objections.kinds.criterion')}: ${c.name}` })),
    ...result.template.behaviours.map((b) => ({ value: `behaviour:${b.code}`, kind: 'behaviour' as const, ref: b.code, label: `${t('objections.kinds.behaviour')}: ${b.name}` })),
    ...(['learning', 'init', 'growth'] as const).map((r) => ({ value: `extra:${r}`, kind: 'extra' as const, ref: r, label: `${t('objections.kinds.extra')}: ${t(`result.extra.${r}`)}` })),
  ];
}

/** The employee's one objection: the item and the reason (10 characters); after sending it cannot be raised again. */
export function ObjectionDialog({ result, onClose }: { result: MyResultDto; onClose: () => void }) {
  const { t } = useTranslation('performance');
  const raise = useRaiseObjection();
  const items = useItems(result);
  const [pick, setPick] = useState(items[0]?.value ?? '');
  const [reason, setReason] = useState('');
  const item = items.find((i) => i.value === pick);
  const short = reason.trim().length < OBJECTION_REASON_MIN;
  const submit = () => item && raise.mutate({ itemKind: item.kind, itemRef: item.ref, reason: reason.trim() }, { onSuccess: () => { toast.success(t('objections.sent')); onClose(); } });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t('objections.raiseTitle')} description={t('objections.raiseHint')}>
      <div className="flex flex-col gap-4">
        <FormField label={t('objections.item')}>{(p) => <Select {...p} value={pick} onChange={(e) => setPick(e.target.value)}>{items.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}</Select>}</FormField>
        <FormField label={t('objections.reasonLabel')} hint={t('objections.reasonHint', { count: OBJECTION_REASON_MIN })}>{(p) => <Textarea {...p} rows={4} value={reason} onChange={(e) => setReason(e.target.value)} />}</FormField>
        {raise.isError && <Alert tone="danger">{t('objections.failed')}</Alert>}
      </div>
      <DialogFooter>
        <Button disabled={short || raise.isPending} onClick={submit}>{t('objections.send')}</Button>
        <Button variant="secondary" onClick={onClose}>{t('cancel')}</Button>
      </DialogFooter>
    </Dialog>
  );
}
