import type { CompanyDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Button, Dialog, FormField, Input } from '@/shared/ui';
import { useSaveCompany } from './api';

interface Props {
  company: CompanyDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const isValid = (f: { code: string; nameAr: string; nameEn: string }) => /^[A-Za-z0-9-]{2,20}$/.test(f.code) && f.nameAr.trim().length >= 2 && f.nameEn.trim().length >= 2;

function useCompanyForm(company: CompanyDto | null, close: () => void) {
  const { t } = useTranslation('companies');
  const save = useSaveCompany();
  const [form, setForm] = useState({ code: company?.code ?? '', nameAr: company?.nameAr ?? '', nameEn: company?.nameEn ?? '', isActive: company?.isActive ?? true });
  const submit = async () => {
    try {
      await save.mutateAsync({ ...form, id: company?.id });
      toast.success(t('saved'));
      close();
    } catch {
      /* shown inside the dialog */
    }
  };
  return { form, setForm, save, submit, valid: isValid(form) };
}

export function CompanyDialog({ company, open, onOpenChange }: Props) {
  const { t } = useTranslation('companies');
  const { t: tc } = useTranslation();
  const { form, setForm, save, submit, valid } = useCompanyForm(company, () => onOpenChange(false));

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={company ? t('edit') : t('new')} description={company ? undefined : t('newHint')}>
      <div className="flex flex-col gap-4">
        {save.isError && <Alert>{errorMessage(tc, save.error)}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={`${t('nameAr')} *`}>{(p) => <Input {...p} value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} />}</FormField>
          <FormField label={`${t('nameEn')} *`}>{(p) => <Input {...p} dir="ltr" value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} />}</FormField>
        </div>
        <FormField label={`${t('code')} *`} hint={t('codeHint')}>{(p) => <Input {...p} dir="ltr" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />}</FormField>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-petrol-800" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />{t('active')}</label>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>{tc('actions.cancel')}</Button>
          <Button disabled={!valid || save.isPending} onClick={() => void submit()}>{tc('actions.save')}</Button>
        </div>
      </div>
    </Dialog>
  );
}
