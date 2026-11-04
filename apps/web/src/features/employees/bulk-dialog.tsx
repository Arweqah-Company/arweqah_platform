import type { BulkUpdateResultDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Badge, Button, Dialog } from '@/shared/ui';
import { useBulkUpdate } from './api';
import { BulkForm, EMPTY_BULK, isBulkReady, toBulkInput, type BulkValues } from './bulk-form';

interface Props {
  employeeIds: string[];
  /** The company of the first selected employee: what the unit choices start from. */
  companyId?: string;
  onClose: () => void;
  onDone: () => void;
}

/** Who would change and who would be refused, and why (the rules of the real run). */
function Preview({ result }: { result: BulkUpdateResultDto }) {
  const { t } = useTranslation('employees');
  const { t: tc } = useTranslation();
  return (
    <div className="flex flex-col gap-3" role="status">
      <p className="flex flex-wrap items-center gap-2 text-sm">
        <Badge tone="success">{t('bulk.accepted', { count: result.accepted.length })}</Badge>
        <Badge tone={result.rejected.length ? 'danger' : 'neutral'}>{t('bulk.rejected', { count: result.rejected.length })}</Badge>
      </p>
      {result.rejected.length > 0 && (
        <ul className="max-h-60 divide-y divide-neutral-200 overflow-auto rounded-2xl border border-neutral-200 text-sm">
          {result.rejected.map((r) => (
            <li key={r.id} className="flex flex-col gap-0.5 px-4 py-2">
              <span className="font-medium">{r.fullName || r.id}</span>
              <span className="text-muted">{tc(`errors.${r.code}`, { defaultValue: r.message })}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Edit many employees at once: choose the values, see who would change and who would be refused, then confirm (FR-93). */
export function BulkDialog({ employeeIds, companyId, onClose, onDone }: Props) {
  const { t } = useTranslation('employees');
  const { t: tc } = useTranslation();
  const bulk = useBulkUpdate();
  const [values, setValues] = useState<BulkValues>({ ...EMPTY_BULK, companyId: companyId ?? '' });
  const [preview, setPreview] = useState<BulkUpdateResultDto | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const send = async (dryRun: boolean) => {
    setProblem(null);
    try {
      const result = await bulk.mutateAsync(toBulkInput(values, employeeIds, dryRun));
      if (dryRun) return setPreview(result);
      toast.success(t('bulk.done', { count: result.accepted.length }));
      if (result.rejected.length) toast.warning(t('bulk.someRefused', { count: result.rejected.length }));
      onDone();
    } catch (error) {
      setProblem(errorMessage(tc, error));
    }
  };

  return (
    <Dialog open wide onOpenChange={(open) => !open && onClose()} title={t('bulk.title', { count: employeeIds.length })} description={t('bulk.description')}>
      <div className="flex flex-col gap-4">
        {problem && <Alert>{problem}</Alert>}
        <BulkForm values={values} onChange={(next) => { setValues(next); setPreview(null); }} />
        {preview && <Preview result={preview} />}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>{tc('actions.cancel')}</Button>
          <Button variant={preview ? 'secondary' : 'primary'} disabled={!isBulkReady(values) || bulk.isPending} onClick={() => void send(true)}>{t('bulk.preview')}</Button>
          {preview && <Button disabled={bulk.isPending || preview.accepted.length === 0} onClick={() => void send(false)}>{t('bulk.apply', { count: preview.accepted.length })}</Button>}
        </div>
      </div>
    </Dialog>
  );
}
