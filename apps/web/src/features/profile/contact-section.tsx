import { CorePermission, ownProfileSchema, type EmployeeDto } from '@arweqah-platform/shared';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { errorMessage } from '@/shared/lib/error-message';
import { useLiveError } from '@/shared/lib/live-validation';
import { usePermissions } from '@/core/permissions/can';
import { Alert, Button, FormField, Input, SectionCard } from '@/shared/ui';
import { ownEditable } from './own-editable';
import { useSaveProfile } from './use-save-profile';

type Draft = { personalPhone: string; personalEmail: string };

const draftOf = (e: EmployeeDto): Draft => ({ personalPhone: e.personalPhone ?? '', personalEmail: e.personalEmail ?? '' });
const FIELDS = ['personalPhone', 'personalEmail'] as const;
/** Only the details the person may change are sent: the API refuses the whole save when one of them is locked for them. */
const toInput = (d: Draft, open: readonly string[]) => Object.fromEntries(FIELDS.filter((k) => open.includes(k)).map((k) => [k, d[k].trim() || null]));

/** The contact details a person may change in their employee record (the English name is beside the Arabic one in the basic data); the rest belongs to HR. */
export function ContactSection({ employee }: { employee: EmployeeDto }) {
  const { t } = useTranslation('profile');
  const { t: tc } = useTranslation();
  const { save, pending, isError, error } = useSaveProfile();
  const canUpdate = usePermissions().can(CorePermission.ProfileUpdate);
  const own = ownEditable(employee);
  const open = FIELDS.filter((k) => canUpdate && own.has(k));
  const locked = (k: keyof Draft) => (open.includes(k) ? undefined : t('lock.notEditable'));
  const [draft, setDraft] = useState<Draft>(() => draftOf(employee));
  const set = (key: keyof Draft) => (value: string) => setDraft((prev) => ({ ...prev, [key]: value }));
  const parsed = ownProfileSchema.safeParse(toInput(draft, open));
  // The same shared rules the API enforces, shown while the person types or when they leave a field.
  const problem = (key: keyof Draft): string | undefined => (parsed.success || !parsed.error.issues.some((i) => i.path[0] === key) ? undefined : t(`errors.${key}`));
  const phone = useLiveError(draft.personalPhone, () => problem('personalPhone'));
  const email = useLiveError(draft.personalEmail, () => problem('personalEmail'));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (parsed.success) void save(parsed.data);
  };

  return (
    <SectionCard id="contact" title={t('contact.title')} description={t('contact.description')}>
      <form className="grid gap-x-5 gap-y-4 sm:col-span-2 sm:grid-cols-2" onSubmit={submit} noValidate>
        <fieldset disabled={open.length === 0} className="contents">
        <FormField label={t('contact.personalPhone')} hint={t('contact.phoneHint')} error={phone.error} locked={locked('personalPhone')}>
          {(p) => <Input {...p} readOnly={!open.includes('personalPhone')} onBlur={phone.onBlur} type="tel" dir="ltr" autoComplete="tel" placeholder="+9665XXXXXXXX" value={draft.personalPhone} onChange={(e) => set('personalPhone')(e.target.value)} />}
        </FormField>
        <FormField label={t('contact.personalEmail')} error={email.error} locked={locked('personalEmail')}>
          {(p) => <Input {...p} readOnly={!open.includes('personalEmail')} onBlur={email.onBlur} type="email" dir="ltr" autoComplete="email" value={draft.personalEmail} onChange={(e) => set('personalEmail')(e.target.value)} />}
        </FormField>
        </fieldset>
        {isError && <div className="sm:col-span-2"><Alert>{errorMessage(tc, error)}</Alert></div>}
        {open.length > 0 && <div className="sm:col-span-2"><Button type="submit" disabled={pending || !parsed.success}>{t('contact.save')}</Button></div>}
      </form>
    </SectionCard>
  );
}
