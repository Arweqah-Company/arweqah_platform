import { useTranslation } from 'react-i18next';
import { SectionCard } from '@/shared/ui';
import { TextField } from './fields';

/** The work e-mail is the sign-in identity, so it is entered once and then locked. */
export function ContactSection({ editing }: { editing: boolean }) {
  const { t } = useTranslation('employees');
  return (
    <SectionCard id="contact" title={t('sections.contact')}>
      <TextField name="workEmail" label={t('fields.workEmail')} type="email" required readOnly={editing} hint={editing ? t('hints.emailLocked') : t('hints.workEmail')} />
      <TextField name="personalEmail" label={t('fields.personalEmail')} type="email" />
      <TextField name="workPhone" label={t('fields.workPhone')} type="tel" hint={t('hints.phone')} />
      <TextField name="personalPhone" label={t('fields.personalPhone')} type="tel" hint={t('hints.phone')} />
    </SectionCard>
  );
}
