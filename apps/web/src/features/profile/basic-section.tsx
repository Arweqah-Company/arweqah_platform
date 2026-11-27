import { CorePermission, type EmployeeDto } from '@arweqah-platform/shared';
import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { usePermissions } from '@/core/permissions/can';
import { BasicRequestChanges } from '@/features/employees';
import { errorMessage } from '@/shared/lib/error-message';
import { Link } from 'react-router';
import { Alert, Button, SectionCard } from '@/shared/ui';
import { useBasicRequest, useCancelBasicRequest } from './api';
import { BasicRequestDialog } from './basic-request-dialog';
import { EnglishNameField } from './english-name-field';
import { ownEditable } from './own-editable';

/** My request to change the basic data: waiting (with a cancel button) or just rejected (with HR's reason). */
function RequestStatus({ employee }: { employee: EmployeeDto }) {
  const { t } = useTranslation('profile');
  const { t: tc } = useTranslation();
  const request = useBasicRequest(true).data;
  const cancel = useCancelBasicRequest();
  if (!request || (request.status !== 'pending' && request.status !== 'rejected')) return null;
  const run = async () => {
    try {
      await cancel.mutateAsync();
      toast.success(t('request.cancelled'));
    } catch (error) {
      toast.error(errorMessage(tc, error));
    }
  };
  if (request.status === 'rejected') return <div className="sm:col-span-2"><Alert tone="warning"><strong>{t('request.rejectedTitle')}</strong>{request.rejectionReason ? ` — ${t('request.rejectedReason', { reason: request.rejectionReason })}` : ''}</Alert></div>;
  return (
    <div className="flex flex-col gap-3 sm:col-span-2">
      <Alert tone="info"><strong>{t('request.pendingTitle')}</strong> {t('request.pendingBody')}</Alert>
      <BasicRequestChanges employee={employee} request={request} />
      <div><Button variant="secondary" disabled={cancel.isPending} onClick={() => void run()}>{t('request.cancel')}</Button></div>
    </div>
  );
}

/** The basic personal data kept in the employee record (name, gender, nationality, birth date, marital status): HR keeps it; the employee asks for a change and HR approves (FR-162). */
export function BasicSection({ employee }: { employee: EmployeeDto }) {
  const { t, i18n } = useTranslation('profile');
  const ar = i18n.language === 'ar';
  const canAsk = usePermissions().can(CorePermission.ProfileUpdateBasic);
  const own = ownEditable(employee);
  const waiting = useBasicRequest(canAsk).data?.status === 'pending';
  const [asking, setAsking] = useState(false);
  const named = (v: { nameAr: string; nameEn: string } | null) => (v ? (ar ? v.nameAr : v.nameEn) : null);
  const facts: [string, string | null | undefined][] = [
    [t('basic.fullName'), employee.fullName],
    [t('basic.gender'), employee.gender === null ? null : t(employee.gender === 0 ? 'basic.male' : 'basic.female')],
    [t('basic.nationality'), named(employee.names.nationality)],
    [t('basic.birthDate'), employee.birthDate],
    [t('basic.maritalStatus'), named(employee.names.maritalStatus)],
  ];
  // What the person's grant of «edit employees» lets them change directly is changed on the employee's page (the same fields, one list); only the rest goes to HR as a request.
  const asks = canAsk && !waiting && own.basicAsked.length > 0;
  const action = (
    <div className="flex flex-wrap gap-2">
      {own.basicDirect.length > 0 && <Button asChild variant="secondary" size="sm"><Link to={`/employees/${employee.id}/edit`}>{t('basic.editDirect')}</Link></Button>}
      {asks && <Button variant="secondary" size="sm" onClick={() => setAsking(true)}>{t('request.button')}</Button>}
    </div>
  );
  return (
    <SectionCard id="basic" title={t('basic.title')} description={t('basic.description')} action={action}>
      <div className="grid gap-4 text-sm sm:col-span-2 sm:grid-cols-2">
        {facts.map(([label, value], i) => (
          <Fragment key={label}>
            <dl>
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="mt-0.5">{value || '—'}</dd>
            </dl>
            {i === 0 && <EnglishNameField employee={employee} />}
          </Fragment>
        ))}
      </div>
      {canAsk && <RequestStatus employee={employee} />}
      {asking && <BasicRequestDialog key="request" employee={employee} open={asking} onOpenChange={setAsking} fields={own.basicAsked} />}
    </SectionCard>
  );
}
