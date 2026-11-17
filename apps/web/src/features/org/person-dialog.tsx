import { CorePermission } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { Can } from '@/core/permissions/can';
import { DetailsDialog, TeamsChatButton } from '@/shared/ui';

export interface UnitPerson {
  fullName: string;
  employeeNumber: string;
  workEmail: string;
  managerName: string | null;
}

const ltr = (value: string) => <bdi dir="ltr">{value}</bdi>;

/** A person of a unit (an employee placed in it, or its leader): work number, work e-mail, the unit and the direct manager, with «Chat on Teams». One popup for both lists. */
export function PersonDialog({ person, unit, unitLabel, onClose }: { person: UnitPerson; unit: string; unitLabel?: string; onClose: () => void }) {
  const { t } = useTranslation('org');
  return (
    <DetailsDialog
      title={person.fullName}
      description={t('employees.detailsTitle')}
      onClose={onClose}
      footer={<Can permission={CorePermission.DirectoryContactTeams}><TeamsChatButton email={person.workEmail} /></Can>}
      rows={[
        [t('employees.number'), ltr(person.employeeNumber)],
        [t('employees.workEmail'), ltr(person.workEmail)],
        [unitLabel ?? t('employees.unit'), unit],
        [t('employees.manager'), person.managerName],
      ]}
    />
  );
}
