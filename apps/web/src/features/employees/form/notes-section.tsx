import { useTranslation } from 'react-i18next';
import { SectionCard } from '@/shared/ui';
import { TextAreaField } from './fields';

export function NotesSection() {
  const { t } = useTranslation('employees');
  return (
    <SectionCard id="notes" title={t('sections.notes')}>
      <TextAreaField name="notes" label={t('fields.notes')} />
    </SectionCard>
  );
}
