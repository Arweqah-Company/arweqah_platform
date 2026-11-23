import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, FormField, MultiCombobox, type ComboboxOption } from '@/shared/ui';
import { useAudienceCount, useAudienceOptions } from '../api';
import { useDebounced } from '@/shared/lib/use-debounced';
import { audienceOf, audiencePicked, type Draft } from './notice-draft';

function ModeCards({ everyone, onChange }: { everyone: boolean; onChange: (everyone: boolean) => void }) {
  const { t } = useTranslation('notices');
  const cards = [{ value: true, key: 'all' }, { value: false, key: 'custom' }];
  return (
    <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={t('form.audience')}>
      {cards.map((c) => (
        <label key={c.key} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-neutral-200 p-4 text-sm has-[:checked]:border-link has-[:checked]:bg-petrol-50">
          <input type="radio" name="audience-mode" className="mt-1 size-4 accent-petrol-800" checked={everyone === c.value} onChange={() => onChange(c.value)} />
          <span><span className="block font-medium">{t(`form.audienceMode.${c.key}`)}</span><span className="block text-xs text-muted">{t(`form.audienceMode.${c.key}Hint`)}</span></span>
        </label>
      ))}
    </div>
  );
}

function useOptions(): { units: ComboboxOption[]; titles: ComboboxOption[]; groups: ComboboxOption[] } {
  const { t, i18n } = useTranslation('notices');
  const ar = i18n.language === 'ar';
  const data = useAudienceOptions().data;
  return useMemo(
    () => ({
      units: (data?.units ?? []).map((n) => ({ value: n.id, label: ar ? n.nameAr : n.nameEn })),
      titles: (data?.titles ?? []).map((x) => ({ value: x.id, label: ar ? x.nameAr : x.nameEn, hint: ar ? x.unitNameAr : x.unitNameEn })),
      groups: (data?.groups ?? []).map((g) => ({ value: g.id, label: ar ? g.nameAr : g.nameEn, hint: t('form.groupMembers', { count: g.memberCount }) })),
    }),
    [data, ar, t],
  );
}

function CustomPickers({ draft, onPatch }: { draft: Draft; onPatch: (change: Partial<Draft>) => void }) {
  const { t } = useTranslation('notices');
  const options = useOptions();
  return (
    <div className="flex flex-col gap-4">
      <FormField label={t('form.units')}>{(p) => <MultiCombobox label={t('form.units')} id={p.id} values={draft.unitIds} onChange={(unitIds) => onPatch({ unitIds })} options={options.units} />}</FormField>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-petrol-800" checked={draft.includeBelow} onChange={(e) => onPatch({ includeBelow: e.target.checked })} />{t('form.includeBelow')}</label>
      <FormField label={t('form.titles')}>{(p) => <MultiCombobox label={t('form.titles')} id={p.id} values={draft.titleIds} onChange={(titleIds) => onPatch({ titleIds })} options={options.titles} />}</FormField>
      {options.groups.length > 0 && <FormField label={t('form.groups')}>{(p) => <MultiCombobox label={t('form.groups')} id={p.id} values={draft.groupIds} onChange={(groupIds) => onPatch({ groupIds })} options={options.groups} />}</FormField>}
    </div>
  );
}

/** «N employees reach this», asked from the API a moment after the picks stop changing (700 ms). */
function ReachLine({ draft }: { draft: Draft }) {
  const { t } = useTranslation('notices');
  const settled = useDebounced(JSON.stringify(audienceOf(draft)), 700);
  const rules = useMemo(() => JSON.parse(settled) as ReturnType<typeof audienceOf>, [settled]);
  const picked = audiencePicked(draft);
  const count = useAudienceCount(rules, picked);
  if (!picked) return <Alert tone="warning">{t('form.audienceEmpty')}</Alert>;
  const picks = draft.unitIds.length + draft.titleIds.length + draft.groupIds.length;
  const n = count.data?.count;
  return (
    <div className="flex flex-col gap-2">
      <p role="status" className="text-sm font-medium">{!draft.everyone && `${t('form.picked', { count: picks })} · `}{n === undefined ? t('form.counting') : t('form.reach', { count: n })}</p>
      {n === 0 && <Alert tone="warning">{t('form.reachZero')}</Alert>}
    </div>
  );
}

/** The audience: everyone, or units (with what is below them), titles and groups of people; the number it reaches shows under it. */
export function AudienceField({ draft, onPatch }: { draft: Draft; onPatch: (change: Partial<Draft>) => void }) {
  const { t } = useTranslation('notices');
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 text-sm font-medium">{t('form.audience')} *</legend>
      <ModeCards everyone={draft.everyone} onChange={(everyone) => onPatch({ everyone })} />
      {!draft.everyone && <CustomPickers draft={draft} onPatch={onPatch} />}
      <ReachLine draft={draft} />
      <Alert tone="info">{t('form.catchUp')}</Alert>
    </fieldset>
  );
}
