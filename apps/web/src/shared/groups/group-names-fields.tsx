import { useTranslation } from 'react-i18next';
import { useLiveError, useRules } from '@/shared/lib/live-validation';
import { FormField, Input } from '@/shared/ui';
import { useAutoEnglish } from '@/shared/lib/use-auto-english';

export interface GroupNames {
  nameAr: string;
  nameEn: string;
  description: string;
}

/** The names and the note of a group, with the same live validation as every form (used by groups of roles and of people). */
export function GroupNamesFields({ value, onChange }: { value: GroupNames; onChange: (value: GroupNames) => void }) {
  const { t } = useTranslation();
  const rules = useRules();
  const nameAr = useLiveError(value.nameAr, rules.text(2));
  const nameEn = useLiveError(value.nameEn, rules.text(2));
  useAutoEnglish(value.nameAr, value.nameEn, (nameEn) => onChange({ ...value, nameEn }));
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={`${t('groups.nameAr')} *`} error={nameAr.error}>{(p) => <Input {...p} aria-required onBlur={nameAr.onBlur} value={value.nameAr} onChange={(e) => onChange({ ...value, nameAr: e.target.value })} />}</FormField>
        <FormField label={`${t('groups.nameEn')} *`} error={nameEn.error}>{(p) => <Input {...p} aria-required dir="ltr" onBlur={nameEn.onBlur} value={value.nameEn} onChange={(e) => onChange({ ...value, nameEn: e.target.value })} />}</FormField>
      </div>
      <FormField label={t('groups.description')}>{(p) => <Input {...p} maxLength={500} value={value.description} onChange={(e) => onChange({ ...value, description: e.target.value })} />}</FormField>
    </>
  );
}

/** Both names need at least two letters. */
export const groupNamesOk = (v: GroupNames) => v.nameAr.trim().length >= 2 && v.nameEn.trim().length >= 2;
