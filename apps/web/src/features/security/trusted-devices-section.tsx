import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useMe } from '@/core/auth/session';
import { errorMessage } from '@/shared/lib/error-message';
import { Badge, RowAction } from '@/shared/ui';
import { useRemoveTrustedDevice, useTrustedDevices } from './api';

/** Browsers the person trusts after the code step that follows a Microsoft sign-in; shown only while the administrator allows it (or while some exist). */
export function TrustedDevicesSection() {
  const { t, i18n } = useTranslation('security');
  const { t: tc } = useTranslation();
  const enabled = useMe().data?.trustedDevicesEnabled;
  const devices = useTrustedDevices();
  const remove = useRemoveTrustedDevice();
  const list = devices.data ?? [];
  if (!enabled && list.length === 0) return null;
  const day = (iso: string) => new Date(iso).toLocaleDateString(i18n.language);
  const take = async (id: string) => {
    try {
      await remove.mutateAsync(id);
      toast.success(t('trusted.removed'));
    } catch (error) {
      toast.error(errorMessage(tc, error));
    }
  };
  return (
    <section aria-labelledby="trusted-title">
      <h2 id="trusted-title" className="text-lg font-bold">{t('trusted.title')}</h2>
      <p className="mt-1 text-sm text-muted">{t('trusted.description')}</p>
      {list.length === 0 ? <p className="mt-3 text-sm text-muted">{t('trusted.none')}</p> : (
        <ul className="mt-3 flex flex-col divide-y divide-neutral-200 rounded-xl border border-neutral-200">
          {list.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
              <div>
                <p className="flex items-center gap-2 font-medium">{d.label || t('sessions.unknownDevice')}{d.current && <Badge tone="info">{t('trusted.thisBrowser')}</Badge>}</p>
                <p className="text-xs text-muted">{t('trusted.until', { date: day(d.expiresAt) })}</p>
              </div>
              <RowAction label={t('trusted.remove')} icon={Trash2} danger onClick={() => void take(d.id)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
