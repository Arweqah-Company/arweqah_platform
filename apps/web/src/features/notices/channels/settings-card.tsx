import { NOTICE_LIMITS, type NoticeSettingsDto } from '@arweqah-platform/shared';
import { CorePermission } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { usePermissions } from '@/core/permissions/can';
import { errorMessage } from '@/shared/lib/error-message';
import { useLiveError } from '@/shared/lib/live-validation';
import { Alert, Button, FormField, Input, SectionCard } from '@/shared/ui';
import { useAudienceCount, useSaveSettings } from '../api';

const inRange = (value: string, min: number, max: number) => /^\d+$/.test(value) && Number(value) >= min && Number(value) <= max;

/** «Publishing in batches»: the batch size and the gap, with the live line «an audience of N people gets it in X batches over Y minutes». */
export function SettingsCard({ settings }: { settings: NoticeSettingsDto }) {
  const { t } = useTranslation('notices');
  const { t: tc } = useTranslation();
  const { can } = usePermissions();
  const save = useSaveSettings();
  const [size, setSize] = useState(String(settings.batchSize));
  const [gap, setGap] = useState(String(settings.batchIntervalMinutes));
  const { batchSize: sz, batchIntervalMinutes: gp } = NOTICE_LIMITS;
  const sizeLive = useLiveError(size, (v: string) => (inRange(v, sz.min, sz.max) ? undefined : t('settings.sizeRange', { min: sz.min, max: sz.max })));
  const gapLive = useLiveError(gap, (v: string) => (inRange(v, gp.min, gp.max) ? undefined : t('settings.gapRange', { min: gp.min, max: gp.max })));
  const valid = inRange(size, sz.min, sz.max) && inRange(gap, gp.min, gp.max);
  const everyone = useAudienceCount([{ type: 'all' }], can(CorePermission.NoticesManageView)).data?.count;
  const batches = everyone && valid ? Math.ceil(everyone / Number(size)) : null;
  const submit = async () => {
    try {
      await save.mutateAsync({ batchSize: Number(size), batchIntervalMinutes: Number(gap) });
      toast.success(t('settings.saved'));
    } catch (error) {
      toast.error(errorMessage(tc, error));
    }
  };
  return (
    <SectionCard id="channel-settings" title={t('settings.title')} description={t('settings.description')}>
      <FormField label={t('settings.size')} error={sizeLive.error}>{(p) => <Input {...p} type="number" dir="ltr" inputMode="numeric" onBlur={sizeLive.onBlur} value={size} onChange={(e) => setSize(e.target.value)} />}</FormField>
      <FormField label={t('settings.gap')} error={gapLive.error}>{(p) => <Input {...p} type="number" dir="ltr" inputMode="numeric" onBlur={gapLive.onBlur} value={gap} onChange={(e) => setGap(e.target.value)} />}</FormField>
      <div className="flex flex-col gap-3 sm:col-span-2">
        {batches !== null && everyone !== undefined && <Alert tone="info">{t('settings.live', { people: everyone.toLocaleString('en'), batches, minutes: (batches - 1) * Number(gap) })}</Alert>}
        <div><Button disabled={!valid || save.isPending} onClick={() => void submit()}>{t('settings.save')}</Button></div>
      </div>
    </SectionCard>
  );
}
