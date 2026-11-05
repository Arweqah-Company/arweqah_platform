import { CorePermission } from '@arweqah-platform/shared';
import { useState } from 'react';
import { FormProvider } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { usePermissions } from '@/core/permissions/can';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Button, PageHeader } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { EditableFieldsProvider } from './form/fields';
import { ContactSection } from './form/contact-section';
import { ContractSection } from './form/contract-section';
import { NotesSection } from './form/notes-section';
import { PersonalSection } from './form/personal-section';
import { RolesStep } from './form/roles-step';
import { SalarySection } from './form/salary-section';
import { useDefaultRoles } from './form/use-default-roles';
import { useEmployeeForm } from './form/use-employee-form';
import { useEmployeeOptions } from './form/use-options';
import { SectionsNav } from './form/sections-nav';
import { WorkSection } from './form/work-section';

type Step = 'details' | 'roles';

function StepsHeader({ step, steps }: { step: Step; steps: Step[] }) {
  const { t } = useTranslation('employees');
  return (
    <ol aria-label={t('steps.label')} className="mb-6 flex flex-wrap items-center gap-2 text-sm">
      {steps.map((s, index) => (
        <li key={s} aria-current={step === s ? 'step' : undefined} className={cn('flex items-center gap-2 rounded-full border px-3 py-1.5', step === s ? 'border-transparent bg-primary font-medium text-on-primary' : 'border-neutral-200 text-muted')}>
          <span aria-hidden className="font-medium">{index + 1}</span>
          {t(`steps.${s}`)}
        </li>
      ))}
    </ol>
  );
}

interface BarProps {
  editing: boolean;
  id?: string;
  busy: boolean;
  step: Step;
  twoSteps: boolean;
  onNext: () => void;
  onBack: () => void;
}

function SaveBar({ editing, id, busy, step, twoSteps, onNext, onBack }: BarProps) {
  const { t } = useTranslation('employees');
  const { t: tc } = useTranslation();
  const last = !twoSteps || step === 'roles';
  return (
    <div className="sticky bottom-3 z-10 flex h-16 items-center justify-end gap-2 rounded-2xl border border-neutral-200 bg-white/95 px-3 shadow-sm shadow-ink/5 backdrop-blur sm:px-5 lg:bottom-4 lg:col-span-2">
      {step === 'roles' && <Button variant="secondary" onClick={onBack}>{t('back')}</Button>}
      <Button variant="secondary" asChild><Link to={editing ? `/employees/${id}` : '/employees'}>{tc('actions.cancel')}</Link></Button>
      {last ? <Button type="submit" disabled={busy}>{editing ? tc('actions.save') : t('saveAndInvite')}</Button> : <Button onClick={onNext}>{t('next')}</Button>}
    </div>
  );
}

/** Which step is showing and how «Next» and the save button move between them (the roles step exists for who may give roles). */
function useStepFlow(state: ReturnType<typeof useEmployeeForm>, twoSteps: boolean) {
  const [step, setStep] = useState<Step>('details');
  const { form, submit } = state;
  const next = async () => {
    if (await form.trigger(undefined, { shouldFocus: true })) setStep('roles');
  };
  const onSubmit = (e: React.FormEvent) => {
    if (twoSteps && step === 'details') {
      e.preventDefault();
      void next();
      return;
    }
    void submit(e, () => setStep('details'));
  };
  return { step, setStep, next, onSubmit };
}

function DetailsStep({ id, options, state, sensitive }: { id?: string; options: ReturnType<typeof useEmployeeOptions>; state: ReturnType<typeof useEmployeeForm>; sensitive: boolean }) {
  const { employee, editing } = state;
  return (
    <>
      <SectionsNav sensitive={sensitive} />
      <div className="flex flex-col gap-6">
        <WorkSection options={options} currentManager={employee.data?.manager} employeeId={id} />
        <ContactSection editing={editing} />
        <PersonalSection options={options} sensitive={sensitive} />
        <ContractSection options={options} />
        {sensitive && <SalarySection options={options} />}
        <NotesSection />
      </div>
    </>
  );
}

/** The sensitive sections (ID, salary) show for a new employee when the person may handle them, and for an edited one when the API sent them. */
function showsSensitive(editing: boolean, employee: { sensitiveHidden: boolean } | undefined, can: (key: string) => boolean): boolean {
  return editing ? employee?.sensitiveHidden === false : can(CorePermission.EmployeesViewSensitive);
}

function FormBody({ id, options, state }: { id?: string; options: ReturnType<typeof useEmployeeOptions>; state: ReturnType<typeof useEmployeeForm> }) {
  const { t } = useTranslation('employees');
  const { can } = usePermissions();
  const { form, employee, editing } = state;
  const sensitive = showsSensitive(editing, employee.data, can);
  const twoSteps = can(CorePermission.EmployeesAssignRoles) && can(CorePermission.RolesView);
  const editable = employee.data?.editableFields ?? null;
  const flow = useStepFlow(state, twoSteps);
  useDefaultRoles(form, { editing, savedTitleId: employee.data?.jobTitle?.id ?? '', enabled: twoSteps });
  return (
    <FormProvider {...form}>
      <EditableFieldsProvider value={editable}>
      <PageHeader title={editing ? t('editTitle') : t('newTitle')} description={t('formIntro')} />
      {twoSteps && <StepsHeader step={flow.step} steps={['details', 'roles']} />}
      <form onSubmit={flow.onSubmit} noValidate className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
        {flow.step === 'details' ? <DetailsStep id={id} options={options} state={state} sensitive={sensitive} /> : <div className="lg:col-span-2"><RolesStep /></div>}
        <SaveBar editing={editing} id={id} busy={form.formState.isSubmitting} step={flow.step} twoSteps={twoSteps} onNext={() => void flow.next()} onBack={() => flow.setStep('details')} />
      </form>
      </EditableFieldsProvider>
    </FormProvider>
  );
}

/** One page for adding and editing: six sections then (for who may give roles) a second step with the roles, the same rules as the API, one save bar. */
export function EmployeeFormPage() {
  const { t } = useTranslation('employees');
  const { t: tc } = useTranslation();
  const { id } = useParams();
  const options = useEmployeeOptions();
  const state = useEmployeeForm(id, options.raw.idTypes);
  const { ready: permissionsReady } = usePermissions();
  if (state.editing && state.employee.isError) return <Alert>{errorMessage(tc, state.employee.error)}</Alert>;
  if (!options.ready || !permissionsReady || (state.editing && !state.employee.data)) return <p role="status" className="text-sm text-muted">{t('loading')}</p>;
  return <FormBody id={id} options={options} state={state} />;
}
