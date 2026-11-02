import { offeredScopes, type PermissionCatalogGroup, type PermissionGrant, type PermissionScope } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useScopeLabel } from '@/shared/lib/use-scope-label';
import { matchesText } from '@/shared/lib/text-match';
import { Button, SearchInput, Select } from '@/shared/ui';

interface Props {
  catalog: PermissionCatalogGroup[];
  grants: PermissionGrant[];
  onChange: (grants: PermissionGrant[]) => void;
  /** Reaches the target from elsewhere (shown ticked and locked, with where it comes from left to the caller). */
  inherited?: PermissionGrant[];
  disabled?: boolean;
}

/** Every permission of the platform by module: tick it, then choose how far it reaches. Used for roles, groups and people alike. */
export function PermissionMatrix({ catalog, grants, onChange, inherited = [], disabled = false }: Props) {
  const { t, i18n } = useTranslation('roles');
  const scopeLabel = useScopeLabel();
  const [search, setSearch] = useState('');
  const scopeOf = (key: string) => grants.find((p) => p.key === key)?.scope;
  const inheritedOf = (key: string) => inherited.find((p) => p.key === key)?.scope;
  const setGrant = (key: string, scope: PermissionScope | null) => onChange([...grants.filter((p) => p.key !== key), ...(scope ? [{ key, scope }] : [])]);
  const selectAll = () => onChange(catalog.flatMap((group) => group.permissions.map((perm) => ({ key: perm.key, scope: perm.scopes.at(-1) ?? 'company' }))));
  const moduleName = (module: string) => t(`module.${module}`, { defaultValue: module });
  const labelOf = (perm: { labelAr: string; labelEn: string }) => (i18n.language === 'ar' ? perm.labelAr : perm.labelEn);
  const shown = catalog
    .map((group) => ({ ...group, permissions: group.permissions.filter((perm) => matchesText([perm.labelAr, perm.labelEn, perm.key, moduleName(group.module)], search)) }))
    .filter((group) => group.permissions.length > 0);
  return (
    <div className="flex flex-col gap-4">
      <SearchInput aria-label={t('searchPermissions')} placeholder={t('searchPermissions')} value={search} onChange={(e) => setSearch(e.target.value)} />
      {shown.length === 0 && <p role="status" className="text-sm text-muted">{t('noPermissionMatch')}</p>}
      {!disabled && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={selectAll}>{t('selectAll')}</Button>
          <Button size="sm" variant="ghost" onClick={() => onChange([])}>{t('clearAll')}</Button>
        </div>
      )}
      {shown.map((group) => (
        <div key={group.module}>
          <h3 className="mb-1 text-xs font-bold text-muted">{moduleName(group.module)}</h3>
          <ul className="divide-y divide-neutral-200 rounded-[var(--radius-control)] border border-neutral-200">
            {group.permissions.map((perm) => {
              const scope = scopeOf(perm.key);
              const from = inheritedOf(perm.key);
              const label = labelOf(perm);
              return (
                <li key={perm.key} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" disabled={disabled} checked={!!scope} onChange={(e) => setGrant(perm.key, e.target.checked ? (perm.scopes.at(-1) ?? 'company') : null)} />
                    {label}
                    {from && !scope && <span className="rounded-full bg-petrol-50 px-2 py-0.5 text-xs text-fg">{t('inheritedBadge', { scope: scopeLabel(from) })}</span>}
                  </label>
                  {scope && offeredScopes(perm.scopes).length > 1 && (
                    <Select aria-label={`${t('scope')}: ${label}`} className="h-8 w-40" disabled={disabled} value={scope} onChange={(e) => setGrant(perm.key, e.target.value as PermissionScope)}>
                      {offeredScopes(perm.scopes).map((s) => <option key={s} value={s}>{scopeLabel(s)}</option>)}
                    </Select>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
