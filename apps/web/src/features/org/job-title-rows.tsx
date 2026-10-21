import type { JobTitleInput } from '@arweqah-platform/shared';
import { Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, Input } from '@/shared/ui';

interface Props {
  rows: JobTitleInput[];
  onChange: (rows: JobTitleInput[]) => void;
  /** At least one title is mandatory: the last row cannot be removed. */
  minimum?: number;
}

/** Repeating Arabic/English name rows for job titles. */
export function JobTitleRows({ rows, onChange, minimum = 0 }: Props) {
  const { t } = useTranslation('org');
  const patch = (index: number, change: Partial<JobTitleInput>) => onChange(rows.map((r, i) => (i === index ? { ...r, ...change } : r)));
  return (
    <div className="flex flex-col gap-3">
      {rows.map((row, index) => (
        <div key={index} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
          <label className="text-xs">{t('titles.nameAr')}<Input value={row.nameAr} onChange={(e) => patch(index, { nameAr: e.target.value })} /></label>
          <label className="text-xs">{t('titles.nameEn')}<Input dir="ltr" value={row.nameEn} onChange={(e) => patch(index, { nameEn: e.target.value })} /></label>
          <Button size="icon" variant="ghost" aria-label={t('titles.remove')} disabled={rows.length <= minimum} onClick={() => onChange(rows.filter((_, i) => i !== index))}><X className="size-4" /></Button>
        </div>
      ))}
      <Button variant="secondary" size="sm" className="self-start" onClick={() => onChange([...rows, { nameAr: '', nameEn: '' }])}><Plus className="size-4" />{t('titles.add')}</Button>
    </div>
  );
}

export const titleRowsValid = (rows: JobTitleInput[]): boolean => rows.every((r) => r.nameAr.trim().length >= 2 && r.nameEn.trim().length >= 2);
