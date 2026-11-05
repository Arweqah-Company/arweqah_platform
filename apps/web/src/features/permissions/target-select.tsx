import type { PermissionTargetKind } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Combobox, FormField } from '@/shared/ui';
import type { TargetOption } from './api';

interface Props {
  kind: PermissionTargetKind;
  value: string;
  options: TargetOption[] | undefined;
  /** True once the list of this kind has loaded. */
  loaded: boolean;
  onChange: (id: string) => void;
  /** People are searched on the server as the person types in the drop-down. */
  onSearch: (query: string) => void;
}

/**
 * The select of what the permissions go on (a role, a group, a person…).
 * For people the drop-down lists the first ones at once and narrows on the server as you type; the chosen person stays shown even when a new search no longer lists them.
 * When a kind has nothing to choose yet it says so under the field.
 */
export function TargetSelect({ kind, value, options, loaded, onChange, onSearch }: Props) {
  const { t, i18n } = useTranslation('permissions');
  const [picked, setPicked] = useState<TargetOption | null>(null);
  const name = (o: TargetOption) => (i18n.language === 'ar' ? o.nameAr : o.nameEn);
  const listed = options ?? [];
  const shown = picked && picked.id === value && !listed.some((o) => o.id === value) ? [picked, ...listed] : listed;
  const empty = kind !== 'user' && loaded && listed.length === 0;
  const choose = (id: string | null) => { setPicked(shown.find((o) => o.id === id) ?? null); onChange(id ?? ''); };
  return (
    <FormField label={t(`target.${kind}`)} hint={empty ? t(`noTargets.${kind}`) : t(`targetHint.${kind}`, { defaultValue: '' }) || undefined}>
      {(p) => <Combobox id={p.id} aria-describedby={p['aria-describedby']} label={t(`target.${kind}`)} value={value || null} placeholder={t('choose')} options={shown.map((o) => ({ value: o.id, label: name(o) }))} onChange={choose} onSearch={kind === 'user' ? onSearch : undefined} />}
    </FormField>
  );
}
