import { CorePermission, type EmployeeDto } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Can } from '@/core/permissions/can';
import { Badge, Button } from '@/shared/ui';

const P = CorePermission;
export type EmployeeDialog = 'deactivate' | 'terminate' | 'roles' | 'reset' | null;

interface Props {
  employee: EmployeeDto;
  onDialog: (dialog: EmployeeDialog) => void;
  onActivate: () => void;
  onResend: () => void;
}

/** The buttons in the page header: edit, roles, and (de)activation, each shown only with its permission. */
export function HeaderActions({ employee: e, onDialog, onActivate }: Props) {
  const { t } = useTranslation('employees');
  const { t: tc } = useTranslation();
  return (
    <>
      <Can permission={P.EmployeesUpdate}><Button asChild variant="secondary"><Link to={`/employees/${e.id}/edit`}>{tc('actions.edit')}</Link></Button></Can>
      <Can permission={P.EmployeesAssignRoles}><Button variant="secondary" onClick={() => onDialog('roles')}>{t('actions.roles')}</Button></Can>
      <Can permission={P.EmployeesDeactivate}>
        {e.isActive ? <Button variant="danger" onClick={() => onDialog('deactivate')}>{t('actions.deactivate')}</Button> : <Button onClick={onActivate}>{t('actions.activate')}</Button>}
      </Can>
    </>
  );
}

/** Status badges and the secondary actions (invitation, authenticator reset, end of contract). */
export function StatusRow({ employee: e, onDialog, onResend }: Omit<Props, 'onActivate'>) {
  const { t } = useTranslation('employees');
  const { t: tc } = useTranslation();
  const unplaced = !e.isSystemAccount && (!e.orgNode || !e.jobTitle);
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <Badge tone={e.isActive ? 'success' : 'neutral'}>{tc(e.isActive ? 'status.active' : 'status.inactive')}</Badge>
      <Badge tone={e.authenticatorEnabled ? 'success' : 'warning'}>{e.authenticatorEnabled ? t('flags.appLinked') : t('flags.appNotLinked')}</Badge>
      {unplaced && <Badge tone="warning">{t('flags.needsPlacement')}</Badge>}
      <Can permission={P.EmployeesResendInvite}><Button size="sm" variant="ghost" onClick={onResend}>{t('actions.resendInvite')}</Button></Can>
      <Can permission={P.EmployeesResetAuthenticator}><Button size="sm" variant="ghost" onClick={() => onDialog('reset')}>{t('actions.resetAuthenticator')}</Button></Can>
      <Can permission={P.EmployeesTerminate}><Button size="sm" variant="ghost" onClick={() => onDialog('terminate')}>{t('actions.terminate')}</Button></Can>
    </div>
  );
}
