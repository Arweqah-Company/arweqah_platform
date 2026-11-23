import type { BilingualName, EmployeeDto } from '@arweqah-platform/shared';
import { createContext, useContext, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge, SectionCard } from '@/shared/ui';

/** The details the caller's grants of «open an employee» list; `null` = all (the API sends it with the employee). */
const ShownContext = createContext<ReadonlySet<string> | null>(null);
const useIsShown = () => {
  const shown = useContext(ShownContext);
  return (field: string) => !shown || shown.has(field);
};

/** One detail: not drawn at all when its field is not in the list the caller may see. */
function Row({ field, label, children }: { field: string; label: string; children: ReactNode }) {
  const isShown = useIsShown();
  if (!isShown(field)) return null;
  return (
    <dl>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 min-h-6 text-sm">{children || <span className="text-muted">—</span>}</dd>
    </dl>
  );
}

/** A card of details that disappears when none of its fields may be seen. */
function Section({ fields, id, title, children }: { fields: readonly string[]; id: string; title: string; children: ReactNode }) {
  const isShown = useIsShown();
  return fields.some(isShown) ? <SectionCard id={id} title={title}>{children}</SectionCard> : null;
}

const CONTRACT_FIELDS = ['startDate', 'endDate', 'contractTypeId', 'contractCompanyId', 'profession', 'isGosiRegistered', 'isQiwaContract', 'hasMedicalInsurance', 'terminationReasonId'];
const SALARY_FIELDS = ['monthlyGrossSalary', 'salaryCurrencyCountryId', 'iban'];

const ltr = (value: string | number | null | undefined) => (value === null || value === undefined || value === '' ? null : <span dir="ltr">{value}</span>);

interface Props {
  employee: EmployeeDto;
}

/** A looked-up value in the language of the screen (the API sends both spellings with the employee). */
const useName = () => {
  const { i18n } = useTranslation();
  return (name: BilingualName | null | undefined): string | null => (name ? (i18n.language === 'en' ? name.nameEn : name.nameAr) : null);
};

function WorkDetails({ employee: e }: Props) {
  const { t, i18n } = useTranslation('employees');
  const name = useName();
  const ar = i18n.language === 'ar';
  return (
    <SectionCard id="work" title={t('sections.work')}>
      <Row field="companyId" label={t('fields.companyId')}>{ar ? e.company.nameAr : e.company.nameEn}</Row>
      <Row field="relationTypeId" label={t('fields.relationTypeId')}>{name(e.names.relationType)}</Row>
      <Row field="orgNodeId" label={t('fields.orgNodeId')}>{e.orgNode && (ar ? e.orgNode.pathAr : e.orgNode.pathEn)}</Row>
      <Row field="jobTitleId" label={t('fields.jobTitleId')}>{e.jobTitle && (ar ? e.jobTitle.nameAr : e.jobTitle.nameEn)}</Row>
      <Row field="managerId" label={t('fields.managerId')}>{e.manager?.fullName}</Row>
      <Row field="workLocation" label={t('fields.workLocation')}>{e.workLocation}</Row>
      <Row field="workCountryId" label={t('fields.workCountryId')}>{name(e.names.workCountry)}</Row>
      <Row field="workMode" label={t('fields.workMode')}>{e.workMode === null ? null : t(['workMode.onsite', 'workMode.hybrid', 'workMode.remote'][e.workMode] ?? '')}</Row>
    </SectionCard>
  );
}

function ContactAndPersonalDetails({ employee: e }: Props) {
  const { t } = useTranslation('employees');
  const name = useName();
  return (
    <>
      <SectionCard id="contact" title={t('sections.contact')}>
        <Row field="workEmail" label={t('fields.workEmail')}>{ltr(e.workEmail)}</Row>
        <Row field="personalEmail" label={t('fields.personalEmail')}>{ltr(e.personalEmail)}</Row>
        <Row field="workPhone" label={t('fields.workPhone')}>{ltr(e.workPhone)}</Row>
        <Row field="personalPhone" label={t('fields.personalPhone')}>{ltr(e.personalPhone)}</Row>
      </SectionCard>
      <SectionCard id="personal" title={t('sections.personal')}>
        <Row field="employeeNumber" label={t('fields.employeeNumber')}>{ltr(e.employeeNumber)}</Row>
        <Row field="fullName" label={t('fields.fullName')}>{e.fullName}</Row>
        <Row field="fullNameEn" label={t('fields.fullNameEn')}>{ltr(e.fullNameEn)}</Row>
        <Row field="gender" label={t('fields.gender')}>{e.gender === null ? null : t(e.gender === 0 ? 'gender.male' : 'gender.female')}</Row>
        <Row field="birthDate" label={t('fields.birthDate')}>{ltr(e.birthDate)}</Row>
        <Row field="nationalityId" label={t('fields.nationalityId')}>{name(e.names.nationality)}</Row>
        <Row field="maritalStatusId" label={t('fields.maritalStatusId')}>{name(e.names.maritalStatus)}</Row>
        <Row field="residencyStatusId" label={t('fields.residencyStatusId')}>{name(e.names.residencyStatus)}</Row>
        <Row field="idTypeId" label={t('fields.idTypeId')}>{name(e.names.idType)}</Row>
        <Row field="idNumber" label={t('fields.idNumber')}>{ltr(e.idNumber)}</Row>
        <Row field="idExpiryDate" label={t('fields.idExpiryDate')}>{ltr(e.idExpiryDate)}</Row>
      </SectionCard>
    </>
  );
}

function InsuranceDetails({ employee: e }: Props) {
  const { t } = useTranslation('employees');
  const name = useName();
  const yes = (v: boolean) => (v ? t('yes') : t('no'));
  return (
    <>
      <Row field="isGosiRegistered" label={t('fields.isGosiRegistered')}>{yes(e.isGosiRegistered)}</Row>
      {e.isGosiRegistered && (
        <>
          <Row field="gosiCompanyId" label={t('fields.gosiCompanyId')}>{name(e.names.gosiCompany)}</Row>
          <Row field="gosiRegistrationDate" label={t('fields.gosiRegistrationDate')}>{ltr(e.gosiRegistrationDate)}</Row>
          <Row field="gosiSystemId" label={t('fields.gosiSystemId')}>{name(e.names.gosiSystem)}</Row>
        </>
      )}
      <Row field="isQiwaContract" label={t('fields.isQiwaContract')}>{yes(e.isQiwaContract)}</Row>
      <Row field="hasMedicalInsurance" label={t('fields.hasMedicalInsurance')}>{yes(e.hasMedicalInsurance)}</Row>
      {e.hasMedicalInsurance && <Row field="healthInsuranceCompanyId" label={t('fields.healthInsuranceCompanyId')}>{name(e.names.healthInsuranceCompany)}</Row>}
    </>
  );
}

function ContractDetails({ employee: e }: Props) {
  const { t } = useTranslation('employees');
  const name = useName();
  const withOther = (value: BilingualName | null, other: string | null) => `${name(value) ?? ''}${other ? ` — ${other}` : ''}`;
  return (
    <Section fields={CONTRACT_FIELDS} id="contract" title={t('sections.contract')}>
      <Row field="startDate" label={t('fields.startDate')}>{ltr(e.startDate)}</Row>
      <Row field="endDate" label={t('fields.endDate')}>{ltr(e.endDate)}</Row>
      <Row field="contractTypeId" label={t('fields.contractTypeId')}>{withOther(e.names.contractType, e.contractTypeOther)}</Row>
      <Row field="contractCompanyId" label={t('fields.contractCompanyId')}>{name(e.names.contractCompany)}</Row>
      <Row field="profession" label={t('fields.profession')}>{e.profession}</Row>
      <InsuranceDetails employee={e} />
      {e.terminationReasonId && <Row field="terminationReasonId" label={t('fields.terminationReasonId')}>{withOther(e.names.terminationReason, e.terminationReasonOther)}</Row>}
    </Section>
  );
}

function SalaryDetails({ employee: e }: Props) {
  const { t } = useTranslation('employees');
  const name = useName();
  const currencyLabel = (c: EmployeeDto['names']['salaryCurrency']) => (c ? `${name(c)} · ${c.currencyName} (${c.currencyCode})` : null);
  return (
    <Section fields={SALARY_FIELDS} id="salary" title={t('sections.salary')}>
      <Row field="monthlyGrossSalary" label={t('fields.monthlyGrossSalary')}>{ltr(e.monthlyGrossSalary)}</Row>
      <Row field="salaryCurrencyCountryId" label={t('fields.salaryCurrencyCountryId')}>{currencyLabel(e.names.salaryCurrency)}</Row>
      <Row field="iban" label={t('fields.iban')}>{ltr(e.iban)}</Row>
    </Section>
  );
}

function RolesDetails({ employee: e }: { employee: EmployeeDto }) {
  const { t, i18n } = useTranslation('employees');
  return (
    <Section fields={['roles']} id="roles" title={t('sections.roles')}>
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        {e.roles.length === 0 && <span className="text-sm text-muted">—</span>}
        {e.roles.map((r) => <Badge key={r.id} tone="info">{i18n.language === 'en' ? r.nameEn : r.nameAr}</Badge>)}
      </div>
    </Section>
  );
}

/** Read-only view of the form, section by section, with every option shown by name. */
export function DetailsSections({ employee }: Props) {
  const { t } = useTranslation('employees');
  const shown = employee.visibleFields ? new Set(employee.visibleFields) : null;
  return (
    <ShownContext.Provider value={shown}>
    <div className="flex flex-col gap-6">
      <WorkDetails employee={employee} />
      <ContactAndPersonalDetails employee={employee} />
      <ContractDetails employee={employee} />
      <RolesDetails employee={employee} />
      {!employee.sensitiveHidden && <SalaryDetails employee={employee} />}
      {employee.notes && <SectionCard id="notes" title={t('sections.notes')}><p className="text-sm sm:col-span-2">{employee.notes}</p></SectionCard>}
    </div>
    </ShownContext.Provider>
  );
}
