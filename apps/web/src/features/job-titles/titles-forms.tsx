import type { JobTitleDto, TitleTrack } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/lib/error-message';
import { useLiveError, useRules } from '@/shared/lib/live-validation';
import { useAutoEnglish } from '@/shared/lib/use-auto-english';
import { Alert, Button, ConfirmDialog, Dialog, FormField, Input } from '@/shared/ui';
import { useAddTitles, useDeleteTitle, useUpdateTitle, type TitleRowInput } from './api';
import { GradeTrackFields, JobTitleRows, titleRowsValid } from './job-title-rows';
import { ExistingReportsToField } from './reports-to-field';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Adds job titles to the selected unit (only a type that accepts titles gets here). */
export function AddTitlesDialog({ unitId, open, onOpenChange }: DialogProps & { unitId: string }) {
  const { t } = useTranslation('job-titles');
  const { t: tc } = useTranslation();
  const [rows, setRows] = useState<TitleRowInput[]>([{ nameAr: '', nameEn: '' }]);
  const add = useAddTitles(unitId);
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
        <JobTitleRows rows={rows} onChange={setRows} minimum={1} grading />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>{tc('actions.cancel')}</Button>
          <Button disabled={!titleRowsValid(rows, true) || add.isPending} onClick={() => void submit()}>{tc('actions.save')}</Button>
        </div>
      </div>
    </Dialog>
  );
}

/** Renames a job title, or stops it. */
export function EditTitleDialog({ title, open, onOpenChange }: DialogProps & { title: JobTitleDto }) {
  const { t } = useTranslation('job-titles');
  const { t: tc } = useTranslation();
  const rules = useRules();
  const [nameAr, setNameAr] = useState(title.nameAr);
  const [nameEn, setNameEn] = useState(title.nameEn);
  const [isActive, setIsActive] = useState(title.isActive);
  const [grading, setGrading] = useState<{ grade?: number; track?: TitleTrack }>({});
  const [reportsTo, setReportsTo] = useState<string | null | undefined>(undefined);
  const update = useUpdateTitle();
  const arError = useLiveError(nameAr, rules.text(2));
  const enError = useLiveError(nameEn, rules.text(2));
  useAutoEnglish(nameAr, nameEn, setNameEn);
  const valid = nameAr.trim().length >= 2 && nameEn.trim().length >= 2 && (!!grading.grade === !!grading.track);
  const submit = async () => {
    try {
      await update.mutateAsync({ id: title.id, nameAr: nameAr.trim(), nameEn: nameEn.trim(), isActive, ...(grading.grade && grading.track ? grading : {}), ...(reportsTo === undefined ? {} : { reportsToTitleId: reportsTo }) });
      toast.success(t('titles.updated'));
      onOpenChange(false);
    } catch {
      /* shown inside the dialog */
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t('titles.editTitle')}>
      <div className="flex flex-col gap-4">
        {update.isError && <Alert>{errorMessage(tc, update.error)}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={`${t('titles.nameAr')} *`} error={arError.error}>{(p) => <Input {...p} onBlur={arError.onBlur} value={nameAr} onChange={(e) => setNameAr(e.target.value)} />}</FormField>
          <FormField label={`${t('titles.nameEn')} *`} error={enError.error}>{(p) => <Input {...p} dir="ltr" onBlur={enError.onBlur} value={nameEn} onChange={(e) => setNameEn(e.target.value)} />}</FormField>
        </div>
        {title.grade === null && <><p className="text-sm text-muted">{t('titles.noCodeYet')}</p><GradeTrackFields grade={grading.grade} track={grading.track} onChange={(change) => setGrading({ ...grading, ...change })} /></>}
        <ExistingReportsToField titleId={title.id} value={reportsTo} onChange={setReportsTo} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-5 accent-petrol-800" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />{t('titles.active')}</label>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>{tc('actions.cancel')}</Button>
          <Button disabled={!valid || update.isPending} onClick={() => void submit()}>{tc('actions.save')}</Button>
        </div>
      </div>
    </Dialog>
  );
}

/** Removing a job title, behind its own confirmation. */
export function DeleteTitleDialog({ title, open, onOpenChange }: DialogProps & { title: JobTitleDto }) {
  const { t } = useTranslation('job-titles');
  const { t: tc } = useTranslation();
  const remove = useDeleteTitle();
  const confirm = async () => {
    try {
      await remove.mutateAsync(title.id);
      toast.success(t('titles.deleted'));
    } catch (error) {
      toast.error(errorMessage(tc, error));
    } finally {
      onOpenChange(false);
    }
  };
  return <ConfirmDialog open={open} onOpenChange={onOpenChange} tone="danger" busy={remove.isPending} title={t('titles.deleteTitle')} description={t('titles.deleteBody')} confirmLabel={tc('actions.delete')} onConfirm={confirm} />;
}
