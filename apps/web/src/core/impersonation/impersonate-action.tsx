import { UserRoundCog } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/lib/error-message';
import { Button, ConfirmDialog, RowAction } from '@/shared/ui';
import { useImpersonation } from './use-impersonation';

interface Props {
  userId: string;
  name: string;
  isActive: boolean;
  /** A row action is an icon; the employee's page has a button with words. */
  as: 'row' | 'button';
}

/** «Sign in as» for one employee: shown only to who may use it, asks once, then the whole app becomes that person's. */
export function ImpersonateAction({ userId, name, isActive, as }: Props) {
  const { t } = useTranslation();
  const { start, canStartFor } = useImpersonation();
  const [asking, setAsking] = useState(false);
  if (!canStartFor(userId, isActive)) return null;
  const label = t('impersonation.start');
  return (
    <>
      {as === 'row' ? <RowAction label={label} icon={UserRoundCog} onClick={() => setAsking(true)} /> : <Button variant="secondary" onClick={() => setAsking(true)}>{label}</Button>}
      <ConfirmDialog
        open={asking}
        onOpenChange={setAsking}
        title={t('impersonation.dialogTitle', { name })}
        description={t('impersonation.dialogDescription')}
        confirmLabel={label}
        busy={start.isPending}
        onConfirm={() => start.mutateAsync(userId).catch((error: unknown) => { toast.error(errorMessage(t, error)); setAsking(false); })}
      />
    </>
  );
}
