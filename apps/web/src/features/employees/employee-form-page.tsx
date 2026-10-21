import { CorePermission } from '@arweqah-platform/shared';
import { FormProvider } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { usePermissions } from '@/core/permissions/can';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Button, PageHeader } from '@/shared/ui';
import { AccountSection } from './form/account-section';
import { ContactSection } from './form/contact-section';
import { ContractSection } from './form/contract-section';
import { NotesSection } from './form/notes-section';
import { PersonalSection } from './form/personal-section';
import { SalarySection } from './form/salary-section';
import { useEmployeeForm } from './form/use-employee-form';
import { useEmployeeOptions } from './form/use-options';
import { WorkSection } from './form/work-section';

const SECTIONS = ['work', 'contact', 'personal', 'contract', 'salary', 'notes'] as const;

function SectionsNav({ sensitive }: { sensitive: boolean }) {
  const { t } = useTranslation('employees');
  return (
    <nav aria-label={t('sectionsNav')} className="hidden lg:block">
      <ul className="sticky top-24 flex flex-col gap-1 text-sm">
        {SECTIONS.filter((s) => s !== 'salary' || sensitive).map((s) => (
          <li key={s}><a className="block rounded px-3 py-2 hover:bg-neutral-50" href={`#${s}`}>{t(`sections.${s}`)}</a></li>
        ))}
      </ul>
    </nav>
  );
}

function SaveBar({ editing, id, busy }: { editing: boolean; id?: string; busy: boolean }) {
  const { t } = useTranslation('employees');
  const { t: tc } = useTranslation();
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-white px-4 py-3 sm:px-8">
      <div className="mx-auto flex max-w-5xl justify-end gap-2">
        <Button variant="secondary" asChild><Link to={editing ? `/employees/${id}` : '/employees'}>{tc('actions.cancel')}</Link></Button>
        <Button type="submit" disabled={busy}>{editing ? tc('actions.save') : t('saveAndInvite')}</Button>
      </div>
    </div>
  );
}

function FormBody({ id, options, state }: { id?: string; options: ReturnType<typeof useEmployeeOptions>; state: ReturnType<typeof useEmployeeForm> }) {
  const { t } = useTranslation('employees');
  const { can } = usePermissions();
  const { form, employee, editing, submit } = state;
  const sensitive = editing ? employee.data?.sensitiveHidden === false : can(CorePermission.EmployeesViewSensitive);
  const canAssignRoles = !editing && can(CorePermission.EmployeesAssignRoles) && can(CorePermission.RolesView);
  return (
    <FormProvider {...form}>
      <PageHeader title={editing ? t('editTitle') : t('newTitle')} description={t('formIntro')} />
      <form onSubmit={(e) => void submit(e)} noValidate className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <SectionsNav sensitive={sensitive} />
        <div className="flex flex-col gap-6 pb-24">
          <WorkSection options={options} currentManager={employee.data?.manager} employeeId={id} />
          <ContactSection editing={editing} />
          <PersonalSection options={options} sensitive={sensitive} />
          <ContractSection options={options} />
          {sensitive && <SalarySection options={options} />}
          <NotesSection />
          {canAssignRoles && <AccountSection />}
        </div>
        <SaveBar editing={editing} id={id} busy={form.formState.isSubmitting} />
      </form>
    </FormProvider>
  );
}

/** One page for adding and editing: six sections, the same rules as the API, one save bar. */
export function EmployeeFormPage() {
  const { t } = useTranslation('employees');
  const { t: tc } = useTranslation();
  const { id } = useParams();
  const options = useEmployeeOptions();
  const state = useEmployeeForm(id);
  const { ready: permissionsReady } = usePermissions();
  if (state.editing && state.employee.isError) return <Alert>{errorMessage(tc, state.employee.error)}</Alert>;
  if (!options.ready || !permissionsReady || (state.editing && !state.employee.data)) return <p role="status" className="text-sm text-muted">{t('loading')}</p>;
  return <FormBody id={id} options={options} state={state} />;
}
