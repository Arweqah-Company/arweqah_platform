import type { TicketTypeDto, TicketTypeInput } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/lib/error-message';
import { useLiveError, useRules } from '@/shared/lib/live-validation';
import { Alert, Button, Combobox, Dialog, FormField, Input, Textarea } from '@/shared/ui';
import { useAssignees, useSaveType } from '../api';

interface Form {
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  assignee: { id: string; name: string } | null;
  dueDays: string;
  isPersonal: boolean;
  isActive: boolean;
}

const EMPTY: Form = { nameAr: '', nameEn: '', descriptionAr: '', descriptionEn: '', assignee: null, dueDays: '', isPersonal: false, isActive: true };
const text = (value: string | null): string => value ?? '';

const fromType = (t: TicketTypeDto | null): Form =>
  t
    ? { nameAr: t.nameAr, nameEn: t.nameEn, descriptionAr: text(t.descriptionAr), descriptionEn: text(t.descriptionEn), assignee: t.defaultAssignee, dueDays: t.dueDays === null ? '' : String(t.dueDays), isPersonal: t.isPersonal, isActive: t.isActive }
    : EMPTY;

const toInput = (f: Form): TicketTypeInput => ({
  nameAr: f.nameAr.trim(),
  nameEn: f.nameEn.trim(),
  descriptionAr: f.descriptionAr.trim() || null,
  descriptionEn: f.descriptionEn.trim() || null,
  defaultAssigneeUserId: f.assignee?.id ?? null,
  dueDays: f.dueDays ? Number(f.dueDays) : null,
  isPersonal: f.isPersonal,
  isActive: f.isActive,
});

function AssigneeField({ deskId, value, onChange, error }: { deskId: string; value: Form['assignee']; onChange: (v: Form['assignee']) => void; error?: string }) {
  const { t } = useTranslation('tickets');
  const [search, setSearch] = useState('');
  const found = useAssignees(deskId, search).data ?? [];
  const options = [...(value && !found.some((p) => p.id === value.id) ? [{ id: value.id, name: value.name }] : []), ...found].map((p) => ({ value: p.id, label: p.name }));
  return (
    <FormField label={t('setup.type.assignee')} hint={t('setup.type.assigneeHint')} error={error}>
      {(p) => <Combobox id={p.id} label={t('setup.type.assignee')} value={value?.id ?? null} options={options} onSearch={setSearch} onChange={(id) => onChange(id ? { id, name: options.find((o) => o.value === id)?.label ?? '' } : null)} clearable />}
    </FormField>
  );
}

function TypeFields({ deskId, form, set }: { deskId: string; form: Form; set: (change: Partial<Form>) => void }) {
  const { t } = useTranslation('tickets');
  const rules = useRules();
  const nameAr = useLiveError(form.nameAr, rules.text(2));
  const nameEn = useLiveError(form.nameEn, rules.text(2));
  const assignee = useLiveError(form.assignee, (v: Form['assignee']) => (form.isPersonal && !v ? t('setup.type.personalNeedsAssignee') : undefined));
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={`${t('setup.type.nameAr')} *`} error={nameAr.error}>{(p) => <Input {...p} onBlur={nameAr.onBlur} value={form.nameAr} onChange={(e) => set({ nameAr: e.target.value })} />}</FormField>
        <FormField label={`${t('setup.type.nameEn')} *`} error={nameEn.error}>{(p) => <Input {...p} dir="ltr" onBlur={nameEn.onBlur} value={form.nameEn} onChange={(e) => set({ nameEn: e.target.value })} />}</FormField>
        <FormField label={t('setup.type.descriptionAr')}>{(p) => <Textarea {...p} rows={2} maxLength={300} value={form.descriptionAr} onChange={(e) => set({ descriptionAr: e.target.value })} />}</FormField>
        <FormField label={t('setup.type.descriptionEn')}>{(p) => <Textarea {...p} dir="ltr" rows={2} maxLength={300} value={form.descriptionEn} onChange={(e) => set({ descriptionEn: e.target.value })} />}</FormField>
      </div>
      <AssigneeField deskId={deskId} value={form.assignee} onChange={(a) => set({ assignee: a })} error={assignee.error} />
      <FormField label={t('setup.type.dueDays')} hint={t('setup.type.dueDaysHint')}>{(p) => <Input {...p} type="number" dir="ltr" min={1} max={60} value={form.dueDays} onChange={(e) => set({ dueDays: e.target.value })} />}</FormField>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-petrol-800" checked={form.isPersonal} onChange={(e) => set({ isPersonal: e.target.checked })} />{t('setup.type.personal')}</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-petrol-800" checked={form.isActive} onChange={(e) => set({ isActive: e.target.checked })} />{t('setup.type.active')}</label>
    </>
  );
}

const complete = (f: Form) => f.nameAr.trim().length >= 2 && f.nameEn.trim().length >= 2 && !(f.isPersonal && !f.assignee);

/** Adds or edits a type of ticket. The fields live in their own component so "touched" starts fresh at every opening. */
export function TypeDialog({ deskId, type, onClose }: { deskId: string; type: TicketTypeDto | null; onClose: () => void }) {
  const { t } = useTranslation('tickets');
  const { t: tc } = useTranslation();
  const save = useSaveType(deskId);
  const [form, setForm] = useState<Form>(() => fromType(type));
  const submit = async () => {
    try {
      await save.mutateAsync({ typeId: type?.id, values: toInput(form) });
      toast.success(t('setup.type.saved'));
      onClose();
    } catch {
      /* shown in the dialog */
    }
  };
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()} title={type ? t('setup.type.editTitle') : t('setup.type.newTitle')} description={t('setup.type.description')}>
      <div className="flex flex-col gap-4">
        {save.isError && <Alert>{errorMessage(tc, save.error)}</Alert>}
        <TypeFields deskId={deskId} form={form} set={(change) => setForm((f) => ({ ...f, ...change }))} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>{tc('actions.cancel')}</Button>
          <Button disabled={save.isPending || !complete(form)} onClick={() => void submit()}>{tc('actions.save')}</Button>
        </div>
      </div>
    </Dialog>
  );
}
