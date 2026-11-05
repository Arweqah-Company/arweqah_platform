import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDebounced } from '@/shared/lib/use-debounced';
import { Combobox, FormField, type ComboboxOption } from '@/shared/ui';
import { useTitleCard, useTitleSearch } from './api';

interface Props {
  value: string | null | undefined;
  onChange: (id: string | null) => void;
  /** The title being edited: it cannot report to itself. */
  excludeId?: string;
  /** What the chosen title is called, when it is not in the first results of the search (an existing line shown while editing). */
  current?: { id: string; label: string; hint?: string } | null;
}

/** The title this one reports to: a search over every title by name or code, never the title itself. */
export function ReportsToField({ value, onChange, excludeId, current }: Props) {
  const { t, i18n } = useTranslation('job-titles');
  const [search, setSearch] = useState('');
  const found = useTitleSearch(useDebounced(search));
  const options = useMemo<ComboboxOption[]>(() => {
    const list = (found.data?.items ?? []).filter((x) => x.id !== excludeId).map((x) => ({ value: x.id, label: titleLabel(x, i18n.language === 'ar'), hint: x.code ?? undefined }));
    return current && !list.some((o) => o.value === current.id) ? [{ value: current.id, label: current.label, hint: current.hint }, ...list] : list;
  }, [found.data, excludeId, current, i18n.language]);
  return (
    <FormField label={t('titles.reportsTo')} hint={t('titles.reportsToHint')}>
      {(p) => <Combobox id={p.id} label={t('titles.reportsTo')} value={value ?? null} options={options} onSearch={setSearch} onChange={onChange} clearable placeholder={t('titles.reportsToNone')} />}
    </FormField>
  );
}

const titleLabel = (t: { nameAr: string; nameEn: string }, ar: boolean): string => (ar ? t.nameAr : t.nameEn) || t.nameAr;

/**
 * The reporting line of a title that already exists: starts on what the card says, and `value` stays undefined until the person changes it
 * (so a save that did not touch it sends nothing).
 */
export function ExistingReportsToField({ titleId, value, onChange }: { titleId: string; value: string | null | undefined; onChange: (id: string | null) => void }) {
  const { i18n } = useTranslation('job-titles');
  const line = useTitleCard(titleId).data?.reportsTo ?? null;
  const current = line ? { id: line.id, label: titleLabel(line, i18n.language === 'ar'), hint: line.code ?? undefined } : null;
  return <ReportsToField value={value === undefined ? (current?.id ?? null) : value} onChange={onChange} excludeId={titleId} current={current} />;
}
