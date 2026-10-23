import { EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdminMode } from '@/core/admin-mode/use-admin-mode';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, EmptyState, FormField, PageHeader, Select } from '@/shared/ui';
import { usePageVisibility } from './api';
import { RolePagesForm } from './role-pages-form';

/** Which pages each role sees. An admin page: it works only in platform admin mode. */
export function PageVisibilityPage() {
  const { t, i18n } = useTranslation('pageVisibility');
  const { t: tc } = useTranslation();
  const { active } = useAdminMode();
  const data = usePageVisibility();
  const [chosen, setChosen] = useState<string | null>(null);
  if (!active) return <Alert tone="info">{tc('adminMode.needed')}</Alert>;
  if (data.isError) return <Alert>{errorMessage(tc, data.error)}</Alert>;
  if (!data.data) return <p role="status" className="text-sm text-muted">{t('loading')}</p>;
  const role = data.data.roles.find((r) => r.id === chosen) ?? data.data.roles[0];
  if (!role) return <EmptyState icon={EyeOff} title={t('none')} />;
  const name = (r: { nameAr: string; nameEn: string }) => (i18n.language === 'ar' ? r.nameAr : r.nameEn);
  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />
      <div className="flex flex-col gap-6">
        <FormField label={t('role')} hint={t('roleHint')}>
          {(p) => (
            <Select {...p} value={role.id} onChange={(e) => setChosen(e.target.value)}>
              {data.data.roles.map((r) => <option key={r.id} value={r.id}>{name(r)}</option>)}
            </Select>
          )}
        </FormField>
        <RolePagesForm key={`${role.id}-${role.hiddenPages.join()}`} role={role} pages={data.data.pages} />
      </div>
    </>
  );
}
