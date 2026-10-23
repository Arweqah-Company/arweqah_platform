import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ApiError } from '../api/api-client';
import { Alert, CodeInput, Dialog } from '@/shared/ui';
import { useAdminMode } from './use-admin-mode';

const FAILURES: Record<string, string> = { CODE_ALREADY_USED: 'adminMode.used', AUTHENTICATOR_LOCKED: 'adminMode.locked' };

/** Asks for a fresh code from the authenticator app every time admin mode is switched on. */
function CodeForm({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const { activate } = useAdminMode();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const submit = async (finalCode: string) => {
    if (activate.isPending) return;
    setError(null);
    try {
      await activate.mutateAsync(finalCode);
      toast.success(t('adminMode.turnedOn'));
      onDone();
    } catch (failure) {
      setError(t(FAILURES[failure instanceof ApiError ? failure.code : ''] ?? 'adminMode.invalid'));
      setCode('');
    }
  };
  return (
    <div className="flex flex-col gap-4">
      {error && <Alert>{error}</Alert>}
      <CodeInput value={code} onChange={setCode} onComplete={(full) => void submit(full)} label={t('adminMode.codeLabel')} invalid={!!error} disabled={activate.isPending} autoFocus />
      <p className="text-xs text-muted">{t('adminMode.codeHint')}</p>
    </div>
  );
}

export function AdminModeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t('adminMode.dialogTitle')} description={t('adminMode.dialogDescription')}>
      <CodeForm onDone={() => onOpenChange(false)} />
    </Dialog>
  );
}
