import { useTranslation } from 'react-i18next';
import { useLiveError } from '@/shared/lib/live-validation';
import { FormField, Input } from '@/shared/ui';
import { checkTime } from './time-rules';

/**
 * The time worked as hours and minutes. Each box and the two together say what is wrong while the person types or when
 * they leave a box: a bad hours or minutes value under its box, and «more than a day» or «nothing written» under both.
 */
export function TimeFields({ hours, minutes, onHours, onMinutes }: { hours: string; minutes: string; onHours: (v: string) => void; onMinutes: (v: string) => void }) {
  const { t } = useTranslation('tasks');
  const check = checkTime(hours, minutes);
  const hoursLive = useLiveError(hours, () => (check.hoursInvalid ? t('time.errors.hours') : undefined));
  const minutesLive = useLiveError(minutes, () => (check.minutesInvalid ? t('time.errors.minutes') : undefined));
  const group = useLiveError(`${hours}|${minutes}`, () => (check.tooLong ? t('time.errors.tooLong', { hours: check.hours, minutes: check.minutes }) : check.empty ? t('time.errors.empty') : undefined));
  const leave = (own: () => void) => () => {
    own();
    group.onBlur();
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-3">
        <FormField label={`${t('time.hours')} *`} error={hoursLive.error}>
          {(p) => <Input {...p} type="number" inputMode="numeric" dir="ltr" min={0} step={1} aria-required autoFocus aria-invalid={p['aria-invalid'] || !!group.error} value={hours} onBlur={leave(hoursLive.onBlur)} onChange={(e) => onHours(e.target.value)} />}
        </FormField>
        <FormField label={t('time.minutes')} error={minutesLive.error}>
          {(p) => <Input {...p} type="number" inputMode="numeric" dir="ltr" min={0} max={59} step={1} aria-invalid={p['aria-invalid'] || !!group.error} value={minutes} onBlur={leave(minutesLive.onBlur)} onChange={(e) => onMinutes(e.target.value)} />}
        </FormField>
      </div>
      {group.error && (
        <p role="alert" className="text-xs text-danger-text">
          {group.error}
        </p>
      )}
    </div>
  );
}
