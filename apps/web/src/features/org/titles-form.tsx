import type { JobTitleInput, OrgTreeDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Button, Combobox, Dialog, FormField } from '@/shared/ui';
import { useAddTitles } from './api';
import { JobTitleRows, titleRowsValid } from './job-title-rows';

interface Props {
  tree: OrgTreeDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialNodeId?: string | null;
}

/** Form 3: add job titles to a unit that accepts employees. */
export function TitlesForm({ tree, open, onOpenChange, initialNodeId = null }: Props) {
  const { t, i18n } = useTranslation('org');
  const { t: tc } = useTranslation();
  const ar = i18n.language === 'ar';
  const [nodeId, setNodeId] = useState<string | null>(initialNodeId);
  const [rows, setRows] = useState<JobTitleInput[]>([{ nameAr: '', nameEn: '' }]);
  const add = useAddTitles(nodeId ?? '');
  const assignable = new Set(tree.levels.filter((l) => l.isAssignable).map((l) => l.id));
  const options = tree.nodes.filter((n) => assignable.has(n.levelId)).map((n) => ({ value: n.id, label: ar ? n.pathAr : n.pathEn }));

  const submit = async () => {
    try {
      await add.mutateAsync({ jobTitles: rows });
      toast.success(t('titles.saved'));
      onOpenChange(false);
    } catch {
      /* shown inside the dialog */
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t('titles.title')} description={t('titles.description')}>
      <div className="flex flex-col gap-4">
        {add.isError && <Alert>{errorMessage(tc, add.error)}</Alert>}
        <FormField label={`${t('titles.unit')} *`}>{(p) => <Combobox id={p.id} label={t('titles.unit')} value={nodeId} options={options} onChange={setNodeId} />}</FormField>
        <JobTitleRows rows={rows} onChange={setRows} minimum={1} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>{tc('actions.cancel')}</Button>
          <Button disabled={!nodeId || !titleRowsValid(rows) || add.isPending} onClick={() => void submit()}>{tc('actions.save')}</Button>
        </div>
      </div>
    </Dialog>
  );
}
