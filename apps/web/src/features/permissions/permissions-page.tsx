import { PERMISSION_TARGET_KINDS, type PermissionTargetKind } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdminMode } from '@/core/admin-mode/use-admin-mode';
import { useDebounced } from '@/shared/lib/use-debounced';
import { Alert, FormField, Input, PageHeader, Select } from '@/shared/ui';
import { useTargetOptions } from './api';
import { RoleGroupActions, UserGroupActions } from './groups/group-actions';
import { TargetEditor } from './target-editor';

/** One page for all permissions: pick what they go on (a role, a group of roles, one person, a group of people), then set them. */
export function PermissionsPage() {
  const { t, i18n } = useTranslation('permissions');
  const { t: tc } = useTranslation();
  const { active } = useAdminMode();
  const [kind, setKind] = useState<PermissionTargetKind>('role');
  const [id, setId] = useState('');
  const [search, setSearch] = useState('');
  const term = useDebounced(search, 250);
  const options = useTargetOptions(kind, term);
  if (!active) return <Alert tone="info">{tc('adminMode.needed')}</Alert>;
  const change = (next: PermissionTargetKind) => { setKind(next); setId(''); setSearch(''); };
  const name = (o: { nameAr: string; nameEn: string }) => (i18n.language === 'ar' ? o.nameAr : o.nameEn);
  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />
      <div className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t('kind')} hint={t('kindHint')}>
            {(p) => (
              <Select {...p} value={kind} onChange={(e) => change(e.target.value as PermissionTargetKind)}>
                {PERMISSION_TARGET_KINDS.map((k) => <option key={k} value={k}>{t(`kinds.${k}`)}</option>)}
              </Select>
            )}
          </FormField>
          {kind === 'user' && <FormField label={t('searchPerson')} hint={t('searchHint')}>{(p) => <Input {...p} value={search} onChange={(e) => setSearch(e.target.value)} />}</FormField>}
          <FormField label={t(`target.${kind}`)}>
            {(p) => (
              <Select {...p} value={id} onChange={(e) => setId(e.target.value)}>
                <option value="">{t('choose')}</option>
                {(options.data ?? []).map((o) => <option key={o.id} value={o.id}>{name(o)}</option>)}
              </Select>
            )}
          </FormField>
        </div>
        {kind === 'role-group' && <RoleGroupActions id={id} onSelect={setId} />}
        {kind === 'user-group' && <UserGroupActions id={id} onSelect={setId} />}
        {id && <TargetEditor key={`${kind}-${id}`} kind={kind} id={id} />}
      </div>
    </>
  );
}
