import { UserRoundCog } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/lib/error-message';
import { Button } from '@/shared/ui';
import { useMe } from '../auth/session';
import { useImpersonation } from './use-impersonation';

/** Fixed bar at the top while a platform administrator works as another employee: who, for how long it waits, and the way back. */
export function ImpersonationBar() {
  const { t } = useTranslation();
  const user = useMe().data;
  const { current, stop } = useImpersonation();
  if (!current || !user) return null;
  return (
    <div role="status" className="sticky top-0 z-40 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 bg-primary px-4 py-2 text-on-primary" data-tour="impersonation-bar">
      <UserRoundCog className="size-5 shrink-0" aria-hidden />
      <p className="text-sm font-medium">{t('impersonation.bar', { name: user.name, by: current.by.name })}</p>
      <p className="text-sm opacity-90">{t('impersonation.idle', { minutes: current.idleMinutes })}</p>
      <Button size="sm" variant="secondary" disabled={stop.isPending} onClick={() => stop.mutate(undefined, { onError: (error) => toast.error(errorMessage(t, error)) })}>
        {t('impersonation.back')}
      </Button>
    </div>
  );
}
