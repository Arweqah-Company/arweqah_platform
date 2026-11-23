import { CorePermission, type EmployeeDto } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { Can } from '@/core/permissions/can';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Button, Dialog, TeamsChatButton } from '@/shared/ui';
import { useEmployee } from './api';
import { DetailsSections } from './details-sections';
import { EmployeeAvatar } from './employee-avatar';

const titleOf = (e: EmployeeDto, language: string): string | undefined => (e.jobTitle ? (language === 'en' ? e.jobTitle.nameEn : e.jobTitle.nameAr) : undefined);

/** The card of a loaded employee: photo, the details the caller may see, the Teams chat button. */
function QuickBody({ employee: e, onClose }: { employee: EmployeeDto; onClose: () => void }) {
  const { t: tc } = useTranslation();
  return (
    <div className="flex flex-col gap-5">
      <EmployeeAvatar employee={e} size="lg" />
      <DetailsSections employee={e} />
      <div className="flex flex-wrap justify-end gap-2">
        <Can permission={CorePermission.DirectoryContactTeams}><TeamsChatButton email={e.workEmail} /></Can>
        <Button variant="secondary" onClick={onClose}>{tc('actions.close')}</Button>
      </div>
    </div>
  );
}

/**
 * A short employee page as a pop-up, like «My team»: for a person who sees only a few details of the record and has nothing to act on
 * (the API says so with `openAs: 'dialog'`). The details are the ones the caller's «open an employee» lists, with the Teams chat button.
 */
export function EmployeeQuickDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const { t, i18n } = useTranslation('employees');
  const { t: tc } = useTranslation();
  const employee = useEmployee(id);
  const e = employee.data;
  const jobTitle = e ? titleOf(e, i18n.language) : undefined;
  return (
    <Dialog open wide onOpenChange={(open) => !open && onClose()} title={e?.fullName ?? t('team.profile')} description={jobTitle}>
      {employee.isError && <Alert>{errorMessage(tc, employee.error)}</Alert>}
      {!e && !employee.isError && <p role="status" className="text-sm text-muted">{t('loading')}</p>}
      {e && <QuickBody employee={e} onClose={onClose} />}
    </Dialog>
  );
}
