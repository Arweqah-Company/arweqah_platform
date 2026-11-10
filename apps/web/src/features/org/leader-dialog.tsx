import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/lib/error-message';
import { todayInRiyadh } from '@/shared/lib/lines';
import { useDebounced } from '@/shared/lib/use-debounced';
import { useLiveError, useRules } from '@/shared/lib/live-validation';
import { Alert, Button, Combobox, Dialog, DialogFooter, FormField, Input, Select, Textarea } from '@/shared/ui';
import { LEADER_KINDS, type LeaderKind, type OrgNodeLeadersDto } from '@arweqah-platform/shared';
import { useCompanyEmployees, useCompanyOptions, useSetLeader } from './api';
import { leaderCompanies, leaderFormValid, REASON_MIN, toSetLeaderInput, windowProblem, type LeaderForm } from './leader-rules';
import { nodeName, type OrgNode } from './org-model';

interface Props {
  node: OrgNode;
  leaders: OrgNodeLeadersDto;
  /** The company the dialog opens on (the row's company, or none). */
  companyId?: string | null;
  onClose: () => void;
}

/** The employee of the chosen company: found by name or number from the first letter, never from another company. */
function EmployeeField({ companyId, value, onChange }: { companyId: string | null; value: string | null; onChange: (id: string | null) => void }) {
  const { t } = useTranslation('org');
  const [search, setSearch] = useState('');
  const found = useCompanyEmployees(companyId, useDebounced(search));
  const options = (found.data?.items ?? []).map((e) => ({ value: e.id, label: e.fullName, hint: e.employeeNumber }));
  return (
    <FormField label={`${t('leaders.employee')} *`} hint={companyId ? undefined : t('leaders.chooseCompanyFirst')}>
      {(p) => <Combobox id={p.id} label={t('leaders.employee')} value={value} options={options} onSearch={setSearch} onChange={onChange} disabled={!companyId} placeholder={t('leaders.employeePlaceholder')} />}
    </FormField>
  );
}

/** The title of this unit the leader takes: chosen every time, from the unit's active titles; the leader moves to the unit with it from the first day. */
function TitleField({ node, value, onChange }: { node: OrgNode; value: string | null; onChange: (id: string | null) => void }) {
  const { t, i18n } = useTranslation('org');
  const titles = node.titles.filter((x) => x.isActive);
  if (!titles.length) return <Alert tone="warning">{t('leaders.noTitles')}</Alert>;
  return (
    <FormField label={`${t('leaders.jobTitle')} *`} hint={t('leaders.jobTitleHint')}>
      {(p) => (
        <Select {...p} value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
          <option value="">{t('leaders.chooseJobTitle')}</option>
          {titles.map((x) => <option key={x.id} value={x.id}>{i18n.language === 'ar' ? x.nameAr : x.nameEn}</option>)}
        </Select>
      )}
    </FormField>
  );
}

function WindowFields({ form, setForm, today }: { form: LeaderForm; setForm: (next: LeaderForm) => void; today: string }) {
  const { t } = useTranslation('org');
  const problem = windowProblem(form, today);
  const from = useLiveError(form.validFrom, () => (problem === 'fromPast' ? t('leaders.errors.fromPast') : undefined));
  const to = useLiveError(form.validTo, () => (problem === 'toNeeded' ? t('leaders.errors.toNeeded') : problem === 'toBeforeFrom' ? t('leaders.errors.toBeforeFrom') : undefined));
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField label={`${t('leaders.validFrom')} *`} error={from.error}>{(p) => <Input {...p} type="date" dir="ltr" min={today} onBlur={from.onBlur} value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} />}</FormField>
      <FormField label={form.kind === 'acting' ? `${t('leaders.validTo')} *` : t('leaders.validTo')} hint={form.kind === 'leader' ? t('leaders.validToHint') : undefined} error={to.error}>{(p) => <Input {...p} type="date" dir="ltr" min={form.validFrom || today} onBlur={to.onBlur} value={form.validTo} onChange={(e) => setForm({ ...form, validTo: e.target.value })} />}</FormField>
    </div>
  );
}

/** Appoints a leader or an acting leader of the unit for one company, from a day, with a reason. A shared unit offers only the group company. */
export function LeaderDialog({ node, leaders, companyId = null, onClose }: Props) {
  const { t, i18n } = useTranslation('org');
  const { t: tc } = useTranslation();
  const rules = useRules();
  const today = todayInRiyadh();
  const ar = i18n.language === 'ar';
  const companies = useCompanyOptions().data;
  const allowed = useMemo(() => leaderCompanies(leaders.effectiveMode, leaders.groupCompanyId, companies ?? []), [leaders, companies]);
  const [form, setForm] = useState<LeaderForm>({ companyId: leaders.effectiveMode === 'shared' ? leaders.groupCompanyId : companyId, employeeId: null, kind: 'leader', jobTitleId: null, validFrom: today, validTo: '', reason: '' });
  const set = useSetLeader(node.id);
  const reason = useLiveError(form.reason, rules.text(REASON_MIN));
  const submit = async () => {
    try {
      await set.mutateAsync(toSetLeaderInput(form));
      toast.success(t('leaders.saved'));
      onClose();
    } catch {
      /* shown inside the dialog */
    }
  };
  return (
    <Dialog open wide onOpenChange={(open) => !open && onClose()} title={t('leaders.assignTitle')} description={nodeName(node, ar)}>
      <div className="flex flex-col gap-4">
        {set.isError && <Alert>{errorMessage(tc, set.error)}</Alert>}
        {leaders.effectiveMode === 'shared' && <Alert tone="info">{t('leaders.sharedRule')}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={`${t('leaders.company')} *`}>
            {(p) => (
              <Select {...p} value={form.companyId ?? ''} onChange={(e) => setForm({ ...form, companyId: e.target.value || null, employeeId: null })}>
                <option value="">{t('leaders.chooseCompany')}</option>
                {allowed.map((c) => <option key={c.id} value={c.id}>{ar ? c.nameAr : c.nameEn}</option>)}
              </Select>
            )}
          </FormField>
          <FormField label={`${t('leaders.kind')} *`}>
            {(p) => (
              <Select {...p} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as LeaderKind })}>
                {LEADER_KINDS.map((k) => <option key={k} value={k}>{t(`leaders.kinds.${k}`)}</option>)}
              </Select>
            )}
          </FormField>
        </div>
        <EmployeeField companyId={form.companyId} value={form.employeeId} onChange={(employeeId) => setForm({ ...form, employeeId })} />
        {form.kind === 'acting' ? <Alert tone="info">{t('leaders.actingRule')}</Alert> : <TitleField node={node} value={form.jobTitleId} onChange={(jobTitleId) => setForm({ ...form, jobTitleId })} />}
        <WindowFields form={form} setForm={setForm} today={today} />
        <FormField label={`${t('leaders.reason')} *`} error={reason.error}>{(p) => <Textarea {...p} rows={2} onBlur={reason.onBlur} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />}</FormField>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>{tc('actions.cancel')}</Button>
          <Button disabled={!leaderFormValid(form, today) || set.isPending} onClick={() => void submit()}>{tc('actions.save')}</Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}
