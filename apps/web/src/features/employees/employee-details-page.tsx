import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useParams } from 'react-router';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, ConfirmDialog, PageHeader } from '@/shared/ui';
import { useEmployee, useResendInvite, useResetAuthenticator, useSetActive } from './api';
import { DetailsSections } from './details-sections';
import { HeaderActions, StatusRow, type EmployeeDialog } from './employee-actions';
import { useEmployeeOptions } from './form/use-options';
import { InvitationNotice, type InvitationState } from './invitation-notice';
import { RolesDialog } from './roles-dialog';
import { TerminateDialog } from './terminate-dialog';

/** Runs one action, reports the outcome and closes the dialog that started it. */
function useAction(close: () => void) {
  const { t: tc } = useTranslation();
  return async (action: () => Promise<unknown>, message: string) => {
    try {
      await action();
      toast.success(message);
    } catch (error) {
      toast.error(errorMessage(tc, error));
    } finally {
      close();
    }
  };
}

export function EmployeeDetailsPage() {
  const { t } = useTranslation('employees');
  const { t: tc } = useTranslation();
  const { id = '' } = useParams();
  const employee = useEmployee(id);
  const options = useEmployeeOptions();
  const setActive = useSetActive(id);
  const resend = useResendInvite(id);
  const reset = useResetAuthenticator(id);
  const [dialog, setDialog] = useState<EmployeeDialog>(null);
  const [invitation, setInvitation] = useState<InvitationState | null>((useLocation().state as { invitation?: InvitationState } | null)?.invitation ?? null);
  const run = useAction(() => setDialog(null));
  const e = employee.data;
  const closeOn = (name: EmployeeDialog) => ({ open: dialog === name, onOpenChange: (o: boolean) => !o && setDialog(null) });

  if (employee.isError) return <Alert>{errorMessage(tc, employee.error)}</Alert>;
  if (!e || !options.ready) return <p role="status" className="text-sm text-muted">{t('loading')}</p>;

  return (
    <>
      <PageHeader title={e.fullName} description={`${e.employeeNumber} · ${options.label(e.company)}`} actions={<HeaderActions employee={e} onDialog={setDialog} onActivate={() => void run(() => setActive.mutateAsync(true), t('activated'))} onResend={() => undefined} />} />
      <StatusRow employee={e} onDialog={setDialog} onResend={() => void resend.mutateAsync().then(setInvitation)} />
      {invitation && <InvitationNotice invitation={invitation} />}
      <DetailsSections employee={e} options={options} />
      <ConfirmDialog {...closeOn('deactivate')} tone="danger" title={t('deactivateDialog.title')} description={t('deactivateDialog.description')} confirmLabel={t('actions.deactivate')} onConfirm={() => run(() => setActive.mutateAsync(false), t('deactivated'))} />
      <ConfirmDialog {...closeOn('reset')} tone="danger" title={t('resetDialog.title')} description={t('resetDialog.description')} confirmLabel={t('actions.resetAuthenticator')} onConfirm={() => run(async () => setInvitation(await reset.mutateAsync()), t('resetDone'))} />
      <TerminateDialog employeeId={e.id} {...closeOn('terminate')} />
      {dialog === 'roles' && <RolesDialog employee={e} {...closeOn('roles')} />}
    </>
  );
}
