import { SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdminMode } from '@/core/admin-mode/use-admin-mode';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, EmptyState, FormField, PageHeader, Select } from '@/shared/ui';
import { useSetupDesks } from '../api';
import { DeskSettingsForm } from './desk-settings-form';
import { TypesSection } from './types-section';

/** Setup of the departments' ticket desks: reception, durations and types. Only in platform admin mode. */
export function SetupPage() {
  const { t, i18n } = useTranslation('tickets');
  const { t: tc } = useTranslation();
  const ar = i18n.language === 'ar';
  const { active } = useAdminMode();
  const desks = useSetupDesks(active);
  const [chosen, setChosen] = useState<string | null>(null);
  if (!active) return <Alert tone="info">{t('setup.needAdminMode')}</Alert>;
  if (desks.isError) return <Alert>{errorMessage(tc, desks.error)}</Alert>;
  if (!desks.data) return <p role="status" className="text-sm text-muted">{t('loading')}</p>;
  if (desks.data.length === 0) return <EmptyState icon={SlidersHorizontal} title={t('setup.none')} description={t('setup.noneHint')} />;
  const desk = desks.data.find((d) => d.orgNodeId === chosen) ?? desks.data[0];
  if (!desk) return null;
  return (
    <>
      <PageHeader title={t('setup.title')} description={t('setup.description')} />
      <div className="flex flex-col gap-6">
        <FormField label={t('setup.desk')} hint={desk.manager ? t('setup.managerIs', { name: desk.manager.name }) : t('setup.noManager')}>
          {(p) => (
            <Select {...p} value={desk.orgNodeId} onChange={(e) => setChosen(e.target.value)}>
              {desks.data.map((d) => <option key={d.orgNodeId} value={d.orgNodeId}>{ar ? `${d.companyNameAr} — ${d.pathAr}` : `${d.companyNameEn} — ${d.pathEn}`}</option>)}
            </Select>
          )}
        </FormField>
        <DeskSettingsForm key={`${desk.orgNodeId}-${JSON.stringify(desk.settings)}`} desk={desk} />
        <TypesSection desk={desk} />
      </div>
    </>
  );
}
