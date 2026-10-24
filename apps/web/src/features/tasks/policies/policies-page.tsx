import { CorePermission, TASK_POLICY_LIMITS, type TaskPolicyDto, type TaskPolicyInput, type TaskPolicyKey } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useCompanyOptions } from '@/core/api/lookups';
import { Can } from '@/core/permissions/can';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Button, FormField, Input, PageHeader, SectionCard, Select } from '@/shared/ui';
import { usePolicy, useSavePolicy } from '../api';
import { POLICY_SECTIONS } from './policy-sections';

type Form = Record<TaskPolicyKey, string>;

const KEYS = Object.keys(TASK_POLICY_LIMITS) as TaskPolicyKey[];

/** Only the numbers of the rules go into the form (the company is not one of them). */
const toForm = (policy: TaskPolicyInput): Form => Object.fromEntries(KEYS.map((key) => [key, String(policy[key])])) as Form;
const inRange = (key: TaskPolicyKey, value: string): boolean => {
  const n = Number(value);
  return value !== '' && Number.isInteger(n) && n >= TASK_POLICY_LIMITS[key].min && n <= TASK_POLICY_LIMITS[key].max;
};
const valid = (form: Form): boolean => KEYS.every((key) => inRange(key, form[key]));

/** One number of the rules, with its limits shown so no value can switch tasks off. */
function NumberField({ id, form, onChange }: { id: TaskPolicyKey; form: Form; onChange: (id: TaskPolicyKey, value: string) => void }) {
  const { t } = useTranslation('tasks');
  const { min, max } = TASK_POLICY_LIMITS[id];
  return (
    <FormField label={t(`policies.fields.${id}`)} hint={t('policies.range', { min, max })} error={form[id] !== '' && !inRange(id, form[id]) ? t('policies.outOfRange', { min, max }) : undefined}>
      {(p) => <Input {...p} type="number" dir="ltr" min={min} max={max} aria-required value={form[id]} onChange={(e) => onChange(id, e.target.value)} />}
    </FormField>
  );
}

/** The numbers of one company's rules; it starts again (new `key`) when another company is chosen. */
function PolicyForm({ policy }: { policy: TaskPolicyDto }) {
  const { t } = useTranslation('tasks');
  const { t: tc } = useTranslation();
  const save = useSavePolicy(policy.companyId);
  const [form, setForm] = useState<Form>(() => toForm(policy));
  const submit = async () => {
    if (!valid(form)) return;
    try {
      await save.mutateAsync(Object.fromEntries(KEYS.map((key) => [key, Number(form[key])])) as TaskPolicyInput);
      toast.success(t('policies.saved'));
    } catch {
      /* shown above the form */
    }
  };
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      {save.isError && <Alert>{errorMessage(tc, save.error)}</Alert>}
      {POLICY_SECTIONS.map((section) => (
        <SectionCard key={section.id} id={section.id} title={t(`policies.sections.${section.id}`)} description={t(`policies.sections.${section.id}Hint`)}>
          {section.keys.map((key) => <NumberField key={key} id={key} form={form} onChange={(id, value) => setForm({ ...form, [id]: value })} />)}
        </SectionCard>
      ))}
      <Can permission={CorePermission.TasksPoliciesEdit}><div className="flex justify-end"><Button disabled={save.isPending || !valid(form)} onClick={() => void submit()}>{tc('actions.save')}</Button></div></Can>
    </div>
  );
}

/** The rules of tasks for a company: every number is here, with limits (platform admin mode). */
export function PoliciesPage() {
  const { t, i18n } = useTranslation('tasks');
  const { t: tc } = useTranslation();
  const [companyId, setCompanyId] = useState('');
  const companies = useCompanyOptions().data ?? [];
  const policy = usePolicy(true, companyId);
  return (
    <>
      <PageHeader title={t('policies.title')} description={t('policies.description')} />
      <div className="mb-4 max-w-sm">
        <FormField label={t('policies.company')}>
          {(p) => (
            <Select {...p} value={companyId || policy.data?.companyId || ''} onChange={(e) => setCompanyId(e.target.value)}>
              {companies.map((c) => <option key={c.id} value={c.id}>{i18n.language === 'ar' ? c.nameAr : c.nameEn}</option>)}
            </Select>
          )}
        </FormField>
      </div>
      {policy.isError && <Alert>{errorMessage(tc, policy.error)}</Alert>}
      {policy.data && <PolicyForm key={policy.data.companyId} policy={policy.data} />}
    </>
  );
}
