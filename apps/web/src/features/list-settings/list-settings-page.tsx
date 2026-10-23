import { LIST_KEYS, type ListKey } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdminMode } from '@/core/admin-mode/use-admin-mode';
import { useMe } from '@/core/auth/session';
import { Alert, FormField, PageHeader, Select } from '@/shared/ui';
import { ListSettingForm } from './list-setting-form';

/** List management: which columns and filters each list of the platform shows, the same for everyone. */
export function ListSettingsPage() {
  const { t } = useTranslation('listSettings');
  const { t: tc } = useTranslation();
  const { active } = useAdminMode();
  const settings = useMe().data?.listSettings;
  const [chosen, setChosen] = useState<ListKey>(LIST_KEYS[0] as ListKey);
  if (!active) return <Alert tone="info">{tc('adminMode.needed')}</Alert>;
  const current = settings?.[chosen];
  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />
      <div className="flex flex-col gap-6">
        <FormField label={t('listLabel')} hint={t('listHint')}>
          {(p) => (
            <Select {...p} value={chosen} onChange={(e) => setChosen(e.target.value as ListKey)}>
              {LIST_KEYS.map((key) => <option key={key} value={key}>{t(`list.${key}.name`)}</option>)}
            </Select>
          )}
        </FormField>
        <ListSettingForm key={`${chosen}-${JSON.stringify(current)}`} listKey={chosen} current={current} />
      </div>
    </>
  );
}
