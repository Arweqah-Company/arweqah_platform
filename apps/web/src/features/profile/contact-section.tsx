import { CorePermission, ownProfileSchema, type EmployeeDto } from '@arweqah-platform/shared';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/lib/error-message';
import { useLiveError } from '@/shared/lib/live-validation';
import { usePermissions } from '@/core/permissions/can';
import { useSavePreferences } from '@/core/theme/use-save-preferences';
import { Alert, Button, FormField, Input, SectionCard } from '@/shared/ui';

type Draft = { personalPhone: string; personalEmail: string; fullNameEn: string };

const draftOf = (e: EmployeeDto): Draft => ({ personalPhone: e.personalPhone ?? '', personalEmail: e.personalEmail ?? '', fullNameEn: e.fullNameEn ?? '' });
const toInput = (d: Draft) => ({ personalPhone: d.personalPhone.trim() || null, personalEmail: d.personalEmail.trim() || null, fullNameEn: d.fullNameEn.trim() || null });

/** The three details a person may change in their employee record; the rest belongs to HR. */
export function ContactSection({ employee }: { employee: EmployeeDto }) {
  const { t } = useTranslation('profile');
  const { t: tc } = useTranslation();
  const save = useSavePreferences();
  const canUpdate = usePermissions().can(CorePermission.ProfileUpdate);
  const [draft, setDraft] = useState<Draft>(() => draftOf(employee));
  const set = (key: keyof Draft) => (value: string) => setDraft((prev) => ({ ...prev, [key]: value }));
  const parsed = ownProfileSchema.safeParse(toInput(draft));
  // The same shared rules the API enforces, shown while the person types or when they leave a field.
  const problem = (key: keyof Draft): string | undefined => (parsed.success || !parsed.error.issues.some((i) => i.path[0] === key) ? undefined : t(`errors.${key}`));
  const phone = useLiveError(draft.personalPhone, () => problem('personalPhone'));
  const email = useLiveError(draft.personalEmail, () => problem('personalEmail'));
  const nameEn = useLiveError(draft.fullNameEn, () => problem('fullNameEn'));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!parsed.success) return;
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
        <fieldset disabled={!canUpdate} className="contents">
        <FormField label={t('contact.personalPhone')} hint={t('contact.phoneHint')} error={phone.error}>
          {(p) => <Input {...p} onBlur={phone.onBlur} type="tel" dir="ltr" autoComplete="tel" placeholder="+966501234567" value={draft.personalPhone} onChange={(e) => set('personalPhone')(e.target.value)} />}
        </FormField>
        <FormField label={t('contact.personalEmail')} error={email.error}>
          {(p) => <Input {...p} onBlur={email.onBlur} type="email" dir="ltr" autoComplete="email" value={draft.personalEmail} onChange={(e) => set('personalEmail')(e.target.value)} />}
        </FormField>
        <FormField label={t('contact.fullNameEn')} hint={t('contact.nameHint')} error={nameEn.error}>
          {(p) => <Input {...p} onBlur={nameEn.onBlur} dir="ltr" value={draft.fullNameEn} onChange={(e) => set('fullNameEn')(e.target.value)} />}
        </FormField>
        </fieldset>
        {save.isError && <div className="sm:col-span-2"><Alert>{errorMessage(tc, save.error)}</Alert></div>}
        {canUpdate && <div className="sm:col-span-2"><Button type="submit" disabled={save.isPending || !parsed.success}>{t('contact.save')}</Button></div>}
      </form>
    </SectionCard>
  );
}
