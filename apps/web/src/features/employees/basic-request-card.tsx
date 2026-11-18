import { CorePermission, type BasicRequestDto, type EmployeeDto } from '@arweqah-platform/shared';
import { Check, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { usePermissions } from '@/core/permissions/can';
import { errorMessage } from '@/shared/lib/error-message';
import { Button, Dialog, DialogFooter, FormField, SectionCard, Textarea } from '@/shared/ui';
import { useBasicRequest, useDecideBasicRequest } from './api';
import { BasicRequestChanges } from './basic-request-changes';

/** The reason box of a rejection: optional, sent to the employee with the notice. */
function RejectDialog({ open, busy, onClose, onReject }: { open: boolean; busy: boolean; onClose: () => void; onReject: (reason: string) => void }) {
  const { t } = useTranslation('employees');
  const { t: tc } = useTranslation();
  const [reason, setReason] = useState('');
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()} title={t('basicRequest.rejectTitle')} description={t('basicRequest.rejectBody')}>
      <FormField label={t('basicRequest.reason')} hint={t('basicRequest.reasonHint')}>{(p) => <Textarea {...p} maxLength={500} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />}</FormField>
      <DialogFooter>
        <Button variant="secondary" onClick={onClose}>{tc('actions.cancel')}</Button>
        <Button variant="danger" disabled={busy} onClick={() => onReject(reason)}>{t('basicRequest.reject')}</Button>
      </DialogFooter>
    </Dialog>
  );
}

/**
 * The request to change basic data that waits for this employee (FR-162): what would change, and approve / reject for whoever may change every field asked for.
 * Nothing is shown when no request waits. The API decides who may; the buttons only follow the fields the person is allowed to edit.
 */
export function BasicRequestCard({ employee }: { employee: EmployeeDto }) {
  const { t } = useTranslation('employees');
  const { t: tc } = useTranslation();
  const canUpdate = usePermissions().can(CorePermission.EmployeesUpdate);
  const request = useBasicRequest(employee.id, canUpdate).data;
  const decide = useDecideBasicRequest(employee.id);
  const [rejecting, setRejecting] = useState(false);
  if (!request) return null;
  const mayDecide = Object.keys(request.values).every((field) => employee.editableFields.includes(field));
  const run = async (input: Parameters<typeof decide.mutateAsync>[0], done: string) => {
    try {
      await decide.mutateAsync(input);
      toast.success(done);
    } catch (error) {
      toast.error(errorMessage(tc, error));
    } finally {
      setRejecting(false);
    }
  };
  return (
    <SectionCard id="basic-request" title={t('basicRequest.title')} description={t('basicRequest.description')}>
      <BasicRequestChanges employee={employee} request={request as BasicRequestDto} />
      {mayDecide ? (
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <Button disabled={decide.isPending} onClick={() => void run({ approve: true }, t('basicRequest.approved'))}><Check className="size-4" aria-hidden />{t('basicRequest.approve')}</Button>
          <Button variant="secondary" disabled={decide.isPending} onClick={() => setRejecting(true)}><X className="size-4" aria-hidden />{t('basicRequest.reject')}</Button>
        </div>
      ) : <p className="text-sm text-muted sm:col-span-2">{t('basicRequest.noFields')}</p>}
      <RejectDialog open={rejecting} busy={decide.isPending} onClose={() => setRejecting(false)} onReject={(reason) => void run({ approve: false, reason }, t('basicRequest.rejected'))} />
    </SectionCard>
  );
}
