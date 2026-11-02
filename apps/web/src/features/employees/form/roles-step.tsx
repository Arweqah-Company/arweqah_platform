import type { RoleDto } from '@arweqah-platform/shared';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useRoles } from '@/features/roles';
import { Alert, Badge, SectionCard } from '@/shared/ui';
import type { FormState } from './form-state';

export interface RoleGroups {
  everyone?: RoleDto;
  title?: RoleDto;
  /** Head roles of the levels of the employee's company. */
  heads: RoleDto[];
  /** Roles chosen by hand, whoever may give them. */
  manual: RoleDto[];
  /** Roles the person holds that are not offered above (the role of an earlier job title…): shown ticked so they can be taken off. */
  held: RoleDto[];
  /** The role kept by the system from a fact (the manager of employees): shown, not chosen. */
  computed: RoleDto[];
}

/** Which roles the form offers: the Employee role and the role of the chosen job title, the head roles of the company, the manual roles, and whatever else the person holds. */
export function roleGroups(roles: RoleDto[], pick: { jobTitleId: string; companyId: string; heldIds: string[] }): RoleGroups {
  const everyone = roles.find((r) => r.autoRule === 'everyone');
  const title = pick.jobTitleId ? roles.find((r) => r.jobTitleId === pick.jobTitleId) : undefined;
  const heads = roles.filter((r) => r.autoRule === 'node_head' && (!pick.companyId || r.origin?.companyId === pick.companyId));
  const manual = roles.filter((r) => !r.autoRule);
  const computed = roles.filter((r) => r.autoRule === 'has_reports' && pick.heldIds.includes(r.id));
  const shown = new Set([everyone, title, ...heads, ...manual, ...computed].filter((r): r is RoleDto => !!r).map((r) => r.id));
  const held = roles.filter((r) => pick.heldIds.includes(r.id) && !shown.has(r.id));
  return { everyone, title, heads, manual, held, computed };
}

function Row({ checked, disabled, label, badge, onChange }: { checked: boolean; disabled?: boolean; label: string; badge?: string; onChange?: (checked: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" className="size-4 accent-petrol-800" checked={checked} disabled={disabled} onChange={(e) => onChange?.(e.target.checked)} />
      <span>{label}</span>
      {badge && <Badge tone="info">{badge}</Badge>}
    </label>
  );
}

/** Step 2 of the employee form: the roles. The Employee role and the role of the job title are ticked from the start and can be taken off; any other role can be ticked. */
export function RolesStep() {
  const { t, i18n } = useTranslation('employees');
  const { control } = useFormContext<FormState>();
  const roles = useRoles();
  const [jobTitleId, companyId, heldIds] = useWatch({ control, name: ['jobTitleId', 'companyId', 'roleIds'] });
  const name = (r: RoleDto) => (i18n.language === 'en' ? r.nameEn : r.nameAr);
  const groups = roleGroups(roles.data ?? [], { jobTitleId, companyId, heldIds });
  const badgeOf = (r: RoleDto): string | undefined => (r.autoRule === 'everyone' ? t('rolesStep.everyoneBadge') : r.autoRule === 'job_title' ? t('rolesStep.titleBadge') : r.autoRule === 'node_head' ? t('rolesStep.headBadge') : undefined);
  const defaults = [groups.everyone, groups.title].filter((r): r is RoleDto => !!r);
  const more = [...groups.heads, ...groups.manual, ...groups.held];
  return (
    <div className="flex flex-col gap-6">
      <Controller
        control={control}
        name="roleIds"
        render={({ field }) => {
          const row = (r: RoleDto) => (
            <Row key={r.id} checked={field.value.includes(r.id)} label={name(r)} badge={badgeOf(r)} onChange={(on) => field.onChange(on ? [...field.value, r.id] : field.value.filter((id) => id !== r.id))} />
          );
          return (
            <>
              <SectionCard id="default-roles" title={t('rolesStep.defaults')} description={t('rolesStep.defaultsHint')}>
                <div className="flex flex-col gap-2 sm:col-span-2">
                  {defaults.map(row)}
                  {!groups.title && <p className="text-sm text-muted">{t('rolesStep.titleMissing')}</p>}
                  {groups.everyone && !field.value.includes(groups.everyone.id) && <Alert tone="warning">{t('rolesStep.everyoneOff')}</Alert>}
                  {groups.computed.map((r) => <Row key={r.id} checked disabled label={name(r)} badge={t('rolesStep.computedBadge')} />)}
                </div>
              </SectionCard>
              <SectionCard id="extra-roles" title={t('rolesStep.extra')} description={t('rolesStep.extraHint')}>
                <fieldset className="flex flex-col gap-2 sm:col-span-2">
                  <legend className="sr-only">{t('rolesStep.extra')}</legend>
                  {more.length === 0 && <p className="text-sm text-muted">{t('rolesStep.noExtra')}</p>}
                  {more.map(row)}
                </fieldset>
              </SectionCard>
            </>
          );
        }}
      />
    </div>
  );
}
