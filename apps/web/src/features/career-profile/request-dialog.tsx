import { REQUEST_COST_MAX, REQUEST_PLAN_KINDS, MAX_UPLOAD_BYTES, type RequestPlanKind } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Alert, Button, Dialog, DialogFooter, FileDropzone, FormField, Input } from '@/shared/ui';
import { useCreateRequest, useRequestPreview } from './api';

/** Inside or outside the plan, as two cards to choose. */
function PlanCards({ value, onChange }: { value: RequestPlanKind; onChange: (plan: RequestPlanKind) => void }) {
  const { t } = useTranslation('career-profile');
  return (
    <div role="radiogroup" aria-label={t('requests.planLabel')} className="grid gap-2">
      {REQUEST_PLAN_KINDS.map((plan) => (
        <label key={plan} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-neutral-300 bg-white p-3 has-[:checked]:border-link has-[:checked]:bg-petrol-50 has-[:checked]:ring-2 has-[:checked]:ring-link">
          <input type="radio" name="request-plan" className="mt-1 size-4 accent-petrol-800" checked={value === plan} onChange={() => onChange(plan)} />
          <span><b className="block text-fg">{t(plan === 'in' ? 'requests.planIn' : 'requests.planOut')}</b><span className="text-sm text-muted">{t(plan === 'in' ? 'requests.planInHint' : 'requests.planOutHint')}</span></span>
        </label>
      ))}
    </div>
  );
}

/** Who decides a request of this cost, computed by the server, and what is left of the yearly budget; a warning when the cost is above it. */
function Chain({ cost, plan }: { cost: number; plan: RequestPlanKind }) {
  const { t } = useTranslation('career-profile');
  const preview = useRequestPreview(cost, plan).data;
  if (!preview) return null;
  const left = preview.left;
  return (
    <>
      <Alert tone={preview.approverName ? 'info' : 'warning'}>
        <b>{t('requests.decides', { who: t(`requests.whoLevel.${preview.level}`) })}</b>
        <span className="block text-sm">{t(`requests.whyLevel.${preview.level}`)}. {left === null ? t('requests.noCap') : t('requests.left', { left: left.toLocaleString('en') })}</span>
        <span className="block text-sm">{preview.approverName ? t('requests.approver', { name: preview.approverName }) : t('requests.nobody')}</span>
      </Alert>
      {left !== null && cost > left && <Alert tone="warning">{t('requests.overBudget')}</Alert>}
    </>
  );
}

const isCost = (text: string): boolean => /^\d+$/.test(text) && Number(text) <= REQUEST_COST_MAX;

/** «Learning outside the plan»: the course, its cost, in or outside the plan, the retention agreement; the chain of approval is shown at once. */
export function RequestDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('career-profile');
  const create = useCreateRequest();
  const [form, setForm] = useState({ courseName: '', cost: '', plan: 'out' as RequestPlanKind });
  const [file, setFile] = useState<File>();
  const [tried, setTried] = useState(false);
  const nameOk = form.courseName.trim().length >= 2;
  const costOk = isCost(form.cost);
  const submit = () => {
    setTried(true);
    if (!nameOk || !costOk) return;
    create.mutate({ courseName: form.courseName.trim(), cost: Number(form.cost), plan: form.plan, file }, { onSuccess: () => { toast.success(t('requests.sent')); onClose(); } });
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t('requests.title')} description={t('requests.description')}>
      <FormField label={t('requests.course')} error={tried && !nameOk ? t('requests.nameRequired') : undefined}>{(p) => <Input {...p} maxLength={200} value={form.courseName} onChange={(e) => setForm({ ...form, courseName: e.target.value })} />}</FormField>
      <FormField label={t('requests.cost')} error={tried && !costOk ? t('requests.costRequired') : undefined}>{(p) => <Input {...p} inputMode="numeric" dir="ltr" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value.trim() })} />}</FormField>
      <PlanCards value={form.plan} onChange={(plan) => setForm({ ...form, plan })} />
      {costOk && <Chain cost={Number(form.cost)} plan={form.plan} />}
      <FileDropzone label={t('requests.agreement')} hint={t('requests.agreementHint')} accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" maxBytes={MAX_UPLOAD_BYTES} busy={create.isPending} onFiles={(files) => setFile(files[0])} />
      {file && <p className="text-sm text-muted">{t('requests.chosenFile', { name: file.name })}</p>}
      {create.isError && <Alert tone="danger">{t('requests.failed')}</Alert>}
      <DialogFooter>
        <Button disabled={create.isPending} onClick={submit}>{t('requests.send')}</Button>
        <Button variant="secondary" onClick={onClose}>{t('file.close')}</Button>
      </DialogFooter>
    </Dialog>
  );
}
