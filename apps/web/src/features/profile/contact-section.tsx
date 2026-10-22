import { ownProfileSchema, type EmployeeDto } from '@arweqah-platform/shared';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/lib/error-message';
import { useSavePreferences } from '@/core/theme/use-save-preferences';
import { Alert, Button, FormField, Input, SectionCard } from '@/shared/ui';

type Draft = { personalPhone: string; personalEmail: string; fullNameEn: string };

const draftOf = (e: EmployeeDto): Draft => ({ personalPhone: e.personalPhone ?? '', personalEmail: e.personalEmail ?? '', fullNameEn: e.fullNameEn ?? '' });

/** The three details a person may change in their employee record; the rest belongs to HR. */
export function ContactSection({ employee }: { employee: EmployeeDto }) {
  const { t } = useTranslation('profile');
  const { t: tc } = useTranslation();
  const save = useSavePreferences();
  const [draft, setDraft] = useState<Draft>(() => draftOf(employee));
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({});
  const set = (key: keyof Draft) => (value: string) => setDraft((prev) => ({ ...prev, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const input = { personalPhone: draft.personalPhone.trim() || null, personalEmail: draft.personalEmail.trim() || null, fullNameEn: draft.fullNameEn.trim() || null };
    const parsed = ownProfileSchema.safeParse(input);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), t(`errors.${String(i.path[0])}`)])));
      return;
    }
    setErrors({});
    try {
      await save.mutateAsync(parsed.data);
      toast.success(t('saved'));
    } catch (error) {
      toast.error(errorMessage(tc, error));
    }
  };

  return (
    <SectionCard id="contact" title={t('contact.title')} description={t('contact.description')}>
      <form className="grid gap-x-5 gap-y-4 sm:col-span-2 sm:grid-cols-2" onSubmit={(e) => void submit(e)} noValidate>
        <FormField label={t('contact.personalPhone')} hint={t('contact.phoneHint')} error={errors.personalPhone}>
          {(p) => <Input {...p} type="tel" dir="ltr" autoComplete="tel" placeholder="+966501234567" value={draft.personalPhone} onChange={(e) => set('personalPhone')(e.target.value)} />}
        </FormField>
        <FormField label={t('contact.personalEmail')} error={errors.personalEmail}>
          {(p) => <Input {...p} type="email" dir="ltr" autoComplete="email" value={draft.personalEmail} onChange={(e) => set('personalEmail')(e.target.value)} />}
        </FormField>
        <FormField label={t('contact.fullNameEn')} hint={t('contact.nameHint')} error={errors.fullNameEn}>
          {(p) => <Input {...p} dir="ltr" value={draft.fullNameEn} onChange={(e) => set('fullNameEn')(e.target.value)} />}
        </FormField>
        {save.isError && <div className="sm:col-span-2"><Alert>{errorMessage(tc, save.error)}</Alert></div>}
        <div className="sm:col-span-2"><Button type="submit" disabled={save.isPending}>{t('contact.save')}</Button></div>
      </form>
    </SectionCard>
  );
}
