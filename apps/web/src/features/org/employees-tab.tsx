import type { OrgUnitEmployeeDto } from '@arweqah-platform/shared';
import { Users } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Avatar, DetailsDialog, EmptyState } from '@/shared/ui';
import { useUnitEmployees } from './api';
import type { DetailsContext } from './details-tabs';
import { nodeName } from './org-model';

/** The people placed directly in the unit; a click on a name opens their work number, work e-mail, unit and direct manager. */
export function EmployeesTab({ node }: DetailsContext) {
  const { t, i18n } = useTranslation('org');
  const people = useUnitEmployees(node.id);
  const [open, setOpen] = useState<OrgUnitEmployeeDto | null>(null);
  if (people.isError) return <Alert>{errorMessage(t, people.error)}</Alert>;
  if (people.data?.length === 0) return <EmptyState icon={Users} title={t('employees.empty')} description={t('employees.emptyHint')} />;
  const unit = nodeName(node, i18n.language === 'ar');
  return (
    <>
      <p className="mb-2 text-xs text-muted">{t('employees.count', { count: people.data?.length ?? 0 })}</p>
      <ul aria-label={t('employees.tableLabel')} className="divide-y divide-neutral-200 rounded-2xl border border-neutral-200">
        {people.data?.map((p) => (
          <li key={p.id}>
            <button type="button" onClick={() => setOpen(p)} className="flex min-h-11 w-full items-center gap-3 p-2 text-start hover:bg-neutral-50">
              <Avatar name={p.fullName} />
              <span className="font-medium">{p.fullName}</span>
            </button>
          </li>
        ))}
      </ul>
      {open && (
        <DetailsDialog
          title={open.fullName}
          description={t('employees.detailsTitle')}
          onClose={() => setOpen(null)}
          rows={[
            [t('employees.number'), <bdi key="n" dir="ltr">{open.employeeNumber}</bdi>],
            [t('employees.workEmail'), <bdi key="e" dir="ltr">{open.workEmail}</bdi>],
            [t('employees.unit'), unit],
            [t('employees.manager'), open.managerName],
          ]}
        />
      )}
    </>
  );
}
