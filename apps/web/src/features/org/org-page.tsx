import { CorePermission } from '@arweqah-platform/shared';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { usePermissions } from '@/core/permissions/can';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Button, PageHeader } from '@/shared/ui';
import { useDeleteOrgUnit, useOrgTree, type OrgUnitKind } from './api';
import { UnitForm, type UnitTarget } from './unit-form';

export function OrgPage() {
  const { t, i18n } = useTranslation('org');
  const { t: tc } = useTranslation();
  const tree = useOrgTree();
  const remove = useDeleteOrgUnit();
  const canManage = usePermissions().can(CorePermission.OrgManage);
  const [target, setTarget] = useState<UnitTarget | null>(null);
  const name = (u: { nameAr: string; nameEn: string }) => (i18n.language === 'ar' ? u.nameAr : u.nameEn);

  const onDelete = async (kind: OrgUnitKind, unit: { id: string; nameAr: string; nameEn: string }) => {
    if (!window.confirm(t('confirmDelete', { name: name(unit) }))) return;
    try {
      await remove.mutateAsync({ kind, id: unit.id });
      toast.success(t('deleted'));
    } catch (error) {
      toast.error(errorMessage(tc, error));
    }
  };
  const actions = (kind: OrgUnitKind, unit: { id: string; nameAr: string; nameEn: string }, add?: UnitTarget, addLabel?: string) =>
    canManage && (
      <span className="flex gap-1">
        {add && <Button size="sm" variant="ghost" onClick={() => setTarget(add)}><Plus className="size-4" aria-hidden />{addLabel}</Button>}
        <Button size="icon" variant="ghost" aria-label={`${tc('actions.delete')} ${name(unit)}`} onClick={() => void onDelete(kind, unit)}><Trash2 className="size-4" /></Button>
      </span>
    );

  return (
    <>
      <PageHeader title={t('title')} description={t('description')} actions={canManage && <Button onClick={() => setTarget({ kind: 'branch' })}>{t('addBranch')}</Button>} />
      {tree.isError && <Alert>{errorMessage(tc, tree.error)}</Alert>}
      {tree.data?.branches.length === 0 && <p className="text-muted">{t('empty')}</p>}
      <div className="flex flex-col gap-6">
        {tree.data?.branches.map((b) => (
          <section key={b.id} className="rounded-[var(--radius-panel)] border border-line bg-white">
            <header className="flex items-center justify-between border-b border-line px-5 py-3">
              <h2 className="font-bold">{name(b)} <span className="font-latin text-sm font-normal text-muted">{b.code}</span></h2>
              {actions('branch', b, { kind: 'department', branchId: b.id, siblings: b.departments }, t('addDepartment'))}
            </header>
            <ul className="divide-y divide-line">
              {b.departments.map((d) => (
                <li key={d.id} className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <span className="border-s-2 border-gold-500 ps-3 font-medium">{name(d)}</span>
                    {actions('department', d, { kind: 'team', departmentId: d.id }, t('addTeam'))}
                  </div>
                  {d.teams.length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-2 ps-5">
                      {d.teams.map((team) => (
                        <li key={team.id} className="flex items-center gap-1 rounded-full bg-navy-50 py-0.5 ps-3 text-sm">
                          {name(team)}
                          {actions('team', team)}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      {target && <UnitForm target={target} onClose={() => setTarget(null)} />}
    </>
  );
}
