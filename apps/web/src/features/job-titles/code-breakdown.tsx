import type { TitleCodePartsDto } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';

const SLOTS = ['sector', 'department', 'section', 'unit'] as const;

/** The unit code of the title cut into its four slots; a slot of zeros means «no level of this type here». */
export const unitSlots = (unitCode: string): string[] => unitCode.split('.');

function Slot({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex min-w-16 flex-col items-center gap-0.5 rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-2">
      <b dir="ltr" className="font-latin text-base">{value}</b>
      <small className="text-center text-xs text-muted">{label}</small>
    </div>
  );
}

/** «What the code means»: sector, department, section, unit, grade and track, and the sequence, each with its name under it. */
export function CodeBreakdown({ parts }: { parts: TitleCodePartsDto }) {
  const { t } = useTranslation('job-titles');
  const slots = unitSlots(parts.unitCode);
  return (
    <div role="group" aria-label={t('card.codeMeaning')} className="flex flex-wrap items-stretch gap-2">
      {SLOTS.map((kind, index) => {
        const value = slots[index] ?? '00';
        return <Slot key={kind} value={value} label={`${t(`card.slot.${kind}`)}${/^0+$/.test(value) ? ` (${t('card.slot.none')})` : ''}`} />;
      })}
      <Slot value={`L${parts.grade}${parts.track}`} label={t('card.slot.gradeTrack')} />
      <Slot value={String(parts.sequence).padStart(2, '0')} label={t('card.slot.sequence')} />
    </div>
  );
}
