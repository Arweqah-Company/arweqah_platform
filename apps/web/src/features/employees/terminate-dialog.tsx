import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Button, Dialog, FormField, Input, Select } from '@/shared/ui';
import { useTerminate } from './api';
import { useEmployeeOptions } from './form/use-options';

interface Props {
  employeeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Ends the relationship: an end date and a reason; the account stops working the day after the end date. */
export function TerminateDialog({ employeeId, open, onOpenChange }: Props) {
  const { t } = useTranslation('employees');
  const { t: tc } = useTranslation();
  const options = useEmployeeOptions();
  const terminate = useTerminate(employeeId);
  const [endDate, setEndDate] = useState('');
  const [reasonId, setReasonId] = useState('');
  const [other, setOther] = useState('');
  const isOther = !!options.terminationReason(reasonId)?.isOther;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await terminate.mutateAsync({ endDate, terminationReasonId: reasonId, terminationReasonOther: isOther ? other : null });
      toast.success(t('terminated'));
      onOpenChange(false);
    } catch {
      /* the error is shown inside the dialog */
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t('terminate.title')} description={t('terminate.description')}>
      <form className="flex flex-col gap-4" onSubmit={(e) => void submit(e)}>
        {terminate.isError && <Alert>{errorMessage(tc, terminate.error)}</Alert>}
        <FormField label={`${t('fields.endDate')} *`}>{(p) => <Input {...p} type="date" dir="ltr" required value={endDate} onChange={(e) => setEndDate(e.target.value)} />}</FormField>
        <FormField label={`${t('fields.terminationReasonId')} *`}>
          {(p) => (
            <Select {...p} required value={reasonId} onChange={(e) => setReasonId(e.target.value)}>
              <option value="">{t('choose')}</option>
              {options.terminationReasons.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          )}
        </FormField>
        {isOther && <FormField label={`${t('fields.terminationReasonOther')} *`}>{(p) => <Input {...p} required value={other} onChange={(e) => setOther(e.target.value)} />}</FormField>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>{tc('actions.cancel')}</Button>
          <Button type="submit" variant="danger" disabled={terminate.isPending || !endDate || !reasonId}>{t('terminate.confirm')}</Button>
        </div>
      </form>
    </Dialog>
  );
}
