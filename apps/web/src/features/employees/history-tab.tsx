import { auditActionText, CorePermission, type AssignmentField, type EmployeeAssignmentDto, type EmployeeChangeDto } from '@arweqah-platform/shared';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { usePermissions } from '@/core/permissions/can';
import { errorMessage } from '@/shared/lib/error-message';
import { Badge, ConfirmDialog, DataTable, RowAction, SectionCard } from '@/shared/ui';
import { useCancelAssignment, useEmployeeAssignments, useEmployeeChanges } from './api';

const FIELD_ORDER: AssignmentField[] = ['org_node', 'job_title', 'manager'];
const STATUS_TONE = { current: 'success', pending: 'warning', past: 'neutral' } as const;

const ltr = (value: string | null) => (value ? <span dir="ltr">{value}</span> : '—');

/** The unit, the job title and the manager of the employee through time, oldest change last; a change that has not started can be cancelled. */
function PlacementTimeline({ employeeId }: { employeeId: string }) {
  const { t, i18n } = useTranslation('employees');
  const { can } = usePermissions();
  const history = useEmployeeAssignments(employeeId);
  const cancel = useCancelAssignment(employeeId);
  const [toCancel, setToCancel] = useState<EmployeeAssignmentDto | null>(null);
  const en = i18n.language === 'en';
  const rows = [...(history.data?.items ?? [])].sort((a, b) => FIELD_ORDER.indexOf(a.field) - FIELD_ORDER.indexOf(b.field) || b.validFrom.localeCompare(a.validFrom));
  const canCancel = can(CorePermission.EmployeesAssignChange);

  return (
    <SectionCard id="placement-history" title={t('history.placement.title')}>
      <div className="sm:col-span-2">
        <p className="mb-3 text-sm text-muted">{t('history.placement.hint')}</p>
        <DataTable
          caption={t('history.placement.title')}
          rows={history.data ? rows : undefined}
          rowKey={(r) => r.id}
          isLoading={history.isLoading}
          error={history.error}
          view="table"
          empty={<p className="p-6 text-center text-sm text-muted">{t('history.placement.empty')}</p>}
          groupOf={(r) => t(`history.field.${r.field}`)}
          columns={[
            { header: t('history.value'), cell: (r) => (r.value ? (en ? r.value.nameEn : r.value.nameAr) : t('history.noManager')) },
            { header: t('history.from'), cell: (r) => ltr(r.validFrom) },
            { header: t('history.to'), cell: (r) => ltr(r.validTo) },
            { header: t('history.status.title'), cell: (r) => <Badge tone={STATUS_TONE[r.status]}>{t(`history.status.${r.status}`)}</Badge> },
            { header: t('history.reason'), cell: (r) => r.reason },
            { header: t('history.by'), cell: (r) => r.createdByName ?? '—' },
          ]}
          actions={(r) => canCancel && r.status === 'pending' && <RowAction label={t('history.cancelChange')} icon={Trash2} danger onClick={() => setToCancel(r)} />}
        />
      </div>
      <ConfirmDialog
        open={!!toCancel}
        onOpenChange={(open) => !open && setToCancel(null)}
        tone="danger"
        title={t('history.cancelDialog.title')}
        description={t('history.cancelDialog.description')}
        confirmLabel={t('history.cancelChange')}
        busy={cancel.isPending}
        onConfirm={async () => {
          try {
            await cancel.mutateAsync(toCancel?.id ?? '');
            toast.success(t('history.cancelled'));
          } catch (error) {
            toast.error(errorMessage(t, error));
          } finally {
            setToCancel(null);
          }
        }}
      />
    </SectionCard>
  );
}

/** What was done to the record: the action, who did it, when, and which fields (names only). */
function ChangeLog({ employeeId }: { employeeId: string }) {
  const { t, i18n } = useTranslation('employees');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const changes = useEmployeeChanges(employeeId, page, pageSize);
  const lang = i18n.language === 'en' ? 'en' : 'ar';
  const fieldName = (name: string) => t(`fields.${name}`, { defaultValue: t(`history.field.${name}`, { defaultValue: name }) });

  return (
    <SectionCard id="change-log" title={t('history.changes.title')}>
      <div className="sm:col-span-2">
        <DataTable
          caption={t('history.changes.title')}
          rows={changes.data?.items}
          rowKey={(r: EmployeeChangeDto) => r.id}
          isLoading={changes.isLoading}
          error={changes.error}
          view="table"
          page={changes.data}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          empty={<p className="p-6 text-center text-sm text-muted">{t('history.changes.empty')}</p>}
          columns={[
            { header: t('history.when'), cell: (r) => <span dir="ltr">{new Date(r.createdAt).toLocaleString(lang === 'en' ? 'en-GB' : 'ar-SA-u-nu-latn')}</span> },
            { header: t('history.what'), cell: (r) => auditActionText(r.action, lang) },
            { header: t('history.fields'), cell: (r) => (r.fields.length ? r.fields.map(fieldName).join(' · ') : '—') },
            { header: t('history.by'), cell: (r) => r.actorName ?? t('history.system') },
          ]}
        />
      </div>
    </SectionCard>
  );
}

/** The «History» tab of an employee's page (FR-90): the placement through time and the log of changes. */
export function HistoryTab({ employeeId }: { employeeId: string }) {
  return (
    <div className="flex flex-col gap-6" data-tour="employee-history">
      <PlacementTimeline employeeId={employeeId} />
      <ChangeLog employeeId={employeeId} />
    </div>
  );
}
