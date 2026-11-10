import { type TicketDeskDto } from '@arweqah-platform/shared';
import { SlidersHorizontal } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdminMode } from '@/core/admin-mode/use-admin-mode';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, EmptyState, FormField, PageHeader, Tabs, TreeSelect } from '@/shared/ui';
import { useSetupDesks } from '../api';
import { DeskSettingsForm } from './desk-settings-form';
import { TypesSection } from './types-section';

const TABS = ['settings', 'types'] as const;
type SetupTab = (typeof TABS)[number];

/** The chosen unit: its settings and its types in two tabs. */
function DeskSetup({ desk, picker }: { desk: TicketDeskDto; picker: ReactNode }) {
  const { t } = useTranslation('tickets');
  const [tab, setTab] = useState<SetupTab>('settings');
  return (
    <>
      <PageHeader title={t('setup.title')} description={t('setup.description')} />
      <div className="flex flex-col gap-6">
        {picker}
        <div>
          <Tabs tabs={TABS.map((id) => ({ id, label: t(`setup.tabs.${id}`) }))} value={tab} label={t('setup.tabsLabel')} onChange={setTab} />
          {tab === 'settings' ? <DeskSettingsForm key={`${desk.orgNodeId}-${JSON.stringify(desk.settings)}`} desk={desk} /> : <TypesSection desk={desk} />}
        </div>
      </div>
    </>
  );
}

/** Setup of the departments' ticket desks: reception, durations and types. Only in platform admin mode. */
export function SetupPage() {
  const { t, i18n } = useTranslation('tickets');
  const { t: tc } = useTranslation();
  const ar = i18n.language === 'ar';
  const { active } = useAdminMode();
  const desks = useSetupDesks(active);
  const [chosen, setChosen] = useState<string | null>(null);
  const items = useMemo(() => (desks.data ?? []).map((d) => ({ id: d.orgNodeId, parentId: d.parentId, label: ar ? d.nameAr : d.nameEn, hint: ar ? `${d.companyNameAr} — ${d.pathAr}` : `${d.companyNameEn} — ${d.pathEn}` })), [desks.data, ar]);
  if (!active) return <Alert tone="info">{t('setup.needAdminMode')}</Alert>;
  if (desks.isError) return <Alert>{errorMessage(tc, desks.error)}</Alert>;
  if (!desks.data) return <p role="status" className="text-sm text-muted">{t('loading')}</p>;
  if (desks.data.length === 0) return <EmptyState icon={SlidersHorizontal} title={t('setup.none')} description={t('setup.noneHint')} />;
  const desk = desks.data.find((d) => d.orgNodeId === chosen) ?? desks.data[0];
  if (!desk) return null;
  const picker = (
    <FormField label={t('setup.desk')} hint={desk.manager ? t('setup.managerIs', { name: desk.manager.name }) : t('setup.noManager')}>
      {(p) => <TreeSelect label={t('setup.desk')} id={p.id} aria-describedby={p['aria-describedby']} value={desk.orgNodeId} onChange={setChosen} items={items} />}
    </FormField>
  );
  return <DeskSetup key={desk.orgNodeId} desk={desk} picker={picker} />;
}
