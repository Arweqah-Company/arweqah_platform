import { basicRequestSchema, type BasicRequestInput, type EmployeeDto } from '@arweqah-platform/shared';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useLookups } from '@/features/employees';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Button, Combobox, DateInput, Dialog, DialogFooter, FormField, Input, Select } from '@/shared/ui';
import { useSendBasicRequest } from './api';

interface Draft { fullName: string; gender: string; nationalityId: string; birthDate: string; maritalStatusId: string }

const draftOf = (e: EmployeeDto): Draft => ({ fullName: e.fullName, gender: e.gender === null ? '' : String(e.gender), nationalityId: e.nationalityId ?? '', birthDate: e.birthDate ?? '', maritalStatusId: e.maritalStatusId ?? '' });

/** What each field sends when it differs from the record (the text is trimmed, the gender is a number); an empty field sends nothing. */
const SEND: { [K in keyof Draft]: (value: string) => string | number } = {
  fullName: (v) => v.trim(),
  gender: Number,
  nationalityId: (v) => v,
  birthDate: (v) => v,
  maritalStatusId: (v) => v,
};

/** Only what differs from the record is asked for: a field left as it is, or empty, is not a change. */
export function changesOf(draft: Draft, record: Draft): BasicRequestInput {
  const keys = Object.keys(SEND) as (keyof Draft)[];
  const changed = keys.filter((k) => draft[k].trim() !== '' && draft[k].trim() !== record[k]);
  return Object.fromEntries(changed.map((k) => [k, SEND[k](draft[k])])) as BasicRequestInput;
}

/** «Ask to change my basic data»: the five fields, filled with the record's values; sending creates a request for HR (nothing changes until it approves). */
export function BasicRequestDialog({ employee, open, onOpenChange }: { employee: EmployeeDto; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t, i18n } = useTranslation('profile');
  const { t: tc } = useTranslation();
  const lookups = useLookups().data;
  const send = useSendBasicRequest();
  const record = draftOf(employee);
  const [draft, setDraft] = useState<Draft>(record);
  const set = (key: keyof Draft) => (value: string) => setDraft((prev) => ({ ...prev, [key]: value }));
  const parsed = basicRequestSchema.safeParse(changesOf(draft, record));
  const birthProblem = !parsed.success && parsed.error.issues.some((i) => i.path[0] === 'birthDate') ? t('request.errors.birthDate') : undefined;
  const label = (x: { nameAr: string; nameEn: string }) => (i18n.language === 'ar' ? x.nameAr : x.nameEn);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!parsed.success) return;
    try {
      await send.mutateAsync(parsed.data);
      toast.success(t('request.sent'));
      onOpenChange(false);
    } catch (error) {
      toast.error(errorMessage(tc, error));
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t('request.title')} description={t('request.description')} wide>
      <form className="grid gap-x-5 gap-y-4 sm:grid-cols-2" onSubmit={(e) => void submit(e)} noValidate>
        <FormField label={t('basic.fullName')} error={draft.fullName.trim() ? undefined : t('request.errors.fullName')}>{(p) => <Input {...p} value={draft.fullName} onChange={(e) => set('fullName')(e.target.value)} />}</FormField>
        <FormField label={t('basic.gender')}>
          {(p) => <Select {...p} value={draft.gender} onChange={(e) => set('gender')(e.target.value)}><option value="" disabled>{t('request.choose')}</option><option value="0">{t('basic.male')}</option><option value="1">{t('basic.female')}</option></Select>}
        </FormField>
        <FormField label={t('basic.nationality')}>{(p) => <Combobox {...p} label={t('basic.nationality')} value={draft.nationalityId} onChange={(v) => set('nationalityId')(v ?? '')} options={(lookups?.countries ?? []).map((c) => ({ value: c.id, label: label(c) }))} />}</FormField>
        <FormField label={t('basic.birthDate')} hint={t('request.birthHint')} error={birthProblem}>{(p) => <DateInput {...p} value={draft.birthDate} onChange={(e) => set('birthDate')(e.target.value)} />}</FormField>
        <FormField label={t('basic.maritalStatus')}>
          {(p) => <Select {...p} value={draft.maritalStatusId} onChange={(e) => set('maritalStatusId')(e.target.value)}><option value="" disabled>{t('request.choose')}</option>{(lookups?.maritalStatuses ?? []).map((m) => <option key={m.id} value={m.id}>{label(m)}</option>)}</Select>}
        </FormField>
        {send.isError && <div className="sm:col-span-2"><Alert>{errorMessage(tc, send.error)}</Alert></div>}
        <div className="sm:col-span-2"><Alert tone="info">{t('request.note')}</Alert></div>
        <div className="sm:col-span-2">
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>{tc('actions.cancel')}</Button>
            <Button type="submit" disabled={send.isPending || !parsed.success}>{t('request.send')}</Button>
          </DialogFooter>
        </div>
      </form>
    </Dialog>
  );
}
