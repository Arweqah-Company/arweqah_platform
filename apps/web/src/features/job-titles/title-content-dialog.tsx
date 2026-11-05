import { CHARTER_ITEM_MAX_LENGTH, CHARTER_LIST_MAX_ITEMS, type JobTitleCardDto, type JobTitleContentInput } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/lib/error-message';
import { listProblem } from '@/shared/lib/lines';
import { Alert, Button, Dialog, DialogFooter, LocalizedLinesField } from '@/shared/ui';
import { useUpdateContent } from './api';

const KINDS = ['responsibilities', 'qualifications', 'kpis'] as const;
const LIMITS = { maxItems: CHARTER_LIST_MAX_ITEMS, maxLength: CHARTER_ITEM_MAX_LENGTH };

/** Whether every list of the content is within the limits of the contract. */
export const contentIsValid = (content: JobTitleContentInput): boolean => KINDS.every((k) => !listProblem(content[k].ar, LIMITS) && !listProblem(content[k].en, LIMITS));

/** Editing the duties, qualifications and indicators of a title (one item per line, both languages); saving raises its content version. */
export function TitleContentDialog({ card, onClose }: { card: JobTitleCardDto; onClose: () => void }) {
  const { t } = useTranslation('job-titles');
  const { t: tc } = useTranslation();
  const [content, setContent] = useState<JobTitleContentInput>({ responsibilities: card.responsibilities, qualifications: card.qualifications, kpis: card.kpis });
  const save = useUpdateContent(card.id);
  const submit = async () => {
    try {
      await save.mutateAsync(content);
      toast.success(t('content.saved'));
      onClose();
    } catch {
      /* shown inside the dialog */
    }
  };
  return (
    <Dialog open wide onOpenChange={(open) => !open && onClose()} title={t('content.title')} description={t('content.description')}>
      <div className="flex flex-col gap-5">
        {save.isError && <Alert>{errorMessage(tc, save.error)}</Alert>}
        {KINDS.map((kind) => <LocalizedLinesField key={kind} label={t(`card.${kind}`)} value={content[kind]} onChange={(next) => setContent({ ...content, [kind]: next })} {...LIMITS} />)}
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>{tc('actions.cancel')}</Button>
          <Button disabled={!contentIsValid(content) || save.isPending} onClick={() => void submit()}>{tc('actions.save')}</Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}
