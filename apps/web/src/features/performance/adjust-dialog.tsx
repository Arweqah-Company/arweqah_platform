import { CALIBRATION_MAX, CALIBRATION_REASON_MIN, CALIBRATION_STEP, calibratedScore, onCalibrationStep, type CalibrationRowDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Alert, Button, Dialog, DialogFooter, FormField, Input, Textarea } from '@/shared/ui';
import { useAdjust } from './api';

/** The form of the adjustment: what was typed, whether it is allowed, and the score it gives. */
function useAdjustForm(row: CalibrationRowDto) {
  const [value, setValue] = useState(String(row.adjustment));
  const [reason, setReason] = useState(row.reason ?? '');
  const adjustment = Number(value);
  const valid = value.trim() !== '' && onCalibrationStep(adjustment);
  const needsReason = valid && adjustment !== 0 && reason.trim().length < CALIBRATION_REASON_MIN;
  const result = row.managerScore !== null && valid ? calibratedScore(row.managerScore, adjustment, row.cap) : null;
  return { value, setValue, reason, setReason, adjustment, valid, needsReason, result };
}

/** The adjustment of one person: a number of half points from −10 to +10, a written reason when it is not zero, and the score it gives. */
export function AdjustDialog({ row, onClose }: { row: CalibrationRowDto; onClose: () => void }) {
  const { t } = useTranslation('performance');
  const save = useAdjust();
  const f = useAdjustForm(row);
  const submit = () => save.mutate({ employeeId: row.employeeId, adjustment: f.adjustment, reason: f.reason.trim() }, { onSuccess: () => { toast.success(t('calibration.saved')); onClose(); } });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t('calibration.adjustTitle', { name: row.name })} description={t('calibration.adjustHint', { score: row.managerScore ?? '—' })}>
      <div className="flex flex-col gap-4">
        <FormField label={t('calibration.adjustment')} hint={t('calibration.adjustmentHint')} error={f.valid ? undefined : t('calibration.adjustmentInvalid')}>{(p) => <Input {...p} type="number" dir="ltr" step={CALIBRATION_STEP} min={-CALIBRATION_MAX} max={CALIBRATION_MAX} value={f.value} onChange={(e) => f.setValue(e.target.value)} />}</FormField>
        <FormField label={t('calibration.reason')} hint={t('calibration.reasonHint', { count: CALIBRATION_REASON_MIN })} error={f.needsReason ? t('calibration.reasonShort', { count: CALIBRATION_REASON_MIN }) : undefined}>{(p) => <Textarea {...p} rows={3} value={f.reason} onChange={(e) => f.setReason(e.target.value)} />}</FormField>
        <p className="text-sm text-fg">{t('calibration.after')}: <b dir="ltr">{f.result ?? '—'}</b></p>
        {save.isError && <Alert tone="danger">{t('calibration.failed')}</Alert>}
      </div>
      <DialogFooter>
        <Button disabled={!f.valid || f.needsReason || save.isPending} onClick={submit}>{t('calibration.save')}</Button>
        <Button variant="secondary" onClick={onClose}>{t('cancel')}</Button>
      </DialogFooter>
    </Dialog>
  );
}
