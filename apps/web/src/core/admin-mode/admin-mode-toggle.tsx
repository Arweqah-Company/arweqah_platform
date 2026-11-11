import { ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { AdminModeDialog } from './admin-mode-dialog';
import { useAdminMode } from './use-admin-mode';

/** After this the server may have switched admin mode off for idleness: ask it again. */
const RECHECK_MARGIN_MS = 1_000;

/**
 * Re-reads the session when the idle time ends, and says so when admin mode switched itself off.
 * Returns what to call when the person switches it off themselves (that is not worth a message).
 */
function useExpiryWatch(adminMode: ReturnType<typeof useAdminMode>): () => void {
  const { t } = useTranslation();
  const { active, expiresAt, refresh } = adminMode;
  const wasActive = useRef(active);
  const manualOff = useRef(false);
  useEffect(() => {
    if (wasActive.current && !active && !manualOff.current) toast.info(t('adminMode.expired'));
    wasActive.current = active;
    manualOff.current = false;
  }, [active, t]);
  useEffect(() => {
    if (!active || !expiresAt) return undefined;
    const timer = setTimeout(() => void refresh(), Math.max(new Date(expiresAt).getTime() - Date.now(), 0) + RECHECK_MARGIN_MS);
    return () => clearTimeout(timer);
  }, [active, expiresAt, refresh]);
  return () => {
    manualOff.current = true;
  };
}

/** Header switch of platform admin mode: off by default, on only after a fresh authenticator code. Shown to those who may use it. */
export function AdminModeToggle() {
  const { t } = useTranslation();
  const adminMode = useAdminMode();
  const [asking, setAsking] = useState(false);
  const markManualOff = useExpiryWatch(adminMode);
  if (!adminMode.available) return null;
  const label = t(adminMode.active ? 'adminMode.turnOff' : 'adminMode.turnOn');
  return (
    <>
      <Button
        variant={adminMode.active ? 'primary' : 'ghost'}
        size="sm"
        className={cn('gap-2 max-sm:size-11 max-sm:px-0', !adminMode.active && 'text-fg')}
        aria-pressed={adminMode.active}
        aria-label={label}
        title={label}
        onClick={() => {
          if (!adminMode.active) return setAsking(true);
          markManualOff();
          adminMode.deactivate.mutate();
        }}
      >
        <ShieldCheck className="size-4" aria-hidden />
        <span className="max-sm:sr-only">{t(adminMode.active ? 'adminMode.on' : 'adminMode.off')}</span>
      </Button>
      <AdminModeDialog open={asking} onOpenChange={setAsking} />
    </>
  );
}
