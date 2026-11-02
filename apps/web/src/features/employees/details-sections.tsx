import type { EmployeeDto } from '@arweqah-platform/shared';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge, SectionCard } from '@/shared/ui';
import type { EmployeeOptions } from './form/use-options';

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div>
    <dt className="text-xs text-muted">{label}</dt>
    <dd className="mt-0.5 min-h-6 text-sm">{children || <span className="text-muted">—</span>}</dd>
  </div>
);

const ltr = (value: string | number | null | undefined) => (value === null || value === undefined || value === '' ? null : <span dir="ltr">{value}</span>);

interface Props {
  employee: EmployeeDto;
  options: EmployeeOptions;
}

type Option = { value: string; label: string };
const nameOf = (list: Option[], id: string | null) => list.find((o) => o.value === id)?.label ?? null;
const choice = (list: Option[], value: number | null) => (value === null ? null : nameOf(list, String(value)));

function WorkDetails({ employee: e, options }: Props) {
  const { t, i18n } = useTranslation('employees');
  const ar = i18n.language === 'ar';
  return (
    <SectionCard id="work" title={t('sections.work')}>
      <Row label={t('fields.companyId')}>{ar ? e.company.nameAr : e.company.nameEn}</Row>
      <Row label={t('fields.relationTypeId')}>{nameOf(options.relationTypes, e.relationTypeId)}</Row>
      <Row label={t('fields.orgNodeId')}>{e.orgNode && (ar ? e.orgNode.pathAr : e.orgNode.pathEn)}</Row>
      <Row label={t('fields.jobTitleId')}>{e.jobTitle && (ar ? e.jobTitle.nameAr : e.jobTitle.nameEn)}</Row>
      <Row label={t('fields.managerId')}>{e.manager?.fullName}</Row>
      <Row label={t('fields.workLocation')}>{e.workLocation}</Row>
      <Row label={t('fields.workCountryId')}>{nameOf(options.countries, e.workCountryId)}</Row>
      <Row label={t('fields.workMode')}>{choice(options.workModes, e.workMode)}</Row>
    </SectionCard>
  );
}

function ContactAndPersonalDetails({ employee: e, options }: Props) {
  const { t } = useTranslation('employees');
  return (
    <>
      <SectionCard id="contact" title={t('sections.contact')}>
        <Row label={t('fields.workEmail')}>{ltr(e.workEmail)}</Row>
        <Row label={t('fields.personalEmail')}>{ltr(e.personalEmail)}</Row>
        <Row label={t('fields.workPhone')}>{ltr(e.workPhone)}</Row>
        <Row label={t('fields.personalPhone')}>{ltr(e.personalPhone)}</Row>
      </SectionCard>
      <SectionCard id="personal" title={t('sections.personal')}>
        <Row label={t('fields.employeeNumber')}>{ltr(e.employeeNumber)}</Row>
        <Row label={t('fields.fullName')}>{e.fullName}</Row>
        <Row label={t('fields.fullNameEn')}>{ltr(e.fullNameEn)}</Row>
        <Row label={t('fields.gender')}>{choice(options.genders, e.gender)}</Row>
        <Row label={t('fields.birthDate')}>{ltr(e.birthDate)}</Row>
        <Row label={t('fields.nationalityId')}>{nameOf(options.countries, e.nationalityId)}</Row>
        <Row label={t('fields.maritalStatusId')}>{nameOf(options.maritalStatuses, e.maritalStatusId)}</Row>
        <Row label={t('fields.residencyStatusId')}>{nameOf(options.residencyStatuses, e.residencyStatusId)}</Row>
        <Row label={t('fields.idTypeId')}>{nameOf(options.idTypes, e.idTypeId)}</Row>
        <Row label={t('fields.idNumber')}>{ltr(e.idNumber)}</Row>
        <Row label={t('fields.idExpiryDate')}>{ltr(e.idExpiryDate)}</Row>
      </SectionCard>
    </>
  );
}

function InsuranceDetails({ employee: e, options }: Props) {
  const { t } = useTranslation('employees');
  const yes = (v: boolean) => (v ? t('yes') : t('no'));
  return (
    <>
      <Row label={t('fields.isGosiRegistered')}>{yes(e.isGosiRegistered)}</Row>
      {e.isGosiRegistered && (
        <>
          <Row label={t('fields.gosiCompanyId')}>{nameOf(options.companies, e.gosiCompanyId)}</Row>
          <Row label={t('fields.gosiRegistrationDate')}>{ltr(e.gosiRegistrationDate)}</Row>
          <Row label={t('fields.gosiSystemId')}>{nameOf(options.gosiSystems, e.gosiSystemId)}</Row>
        </>
      )}
      <Row label={t('fields.isQiwaContract')}>{yes(e.isQiwaContract)}</Row>
      <Row label={t('fields.hasMedicalInsurance')}>{yes(e.hasMedicalInsurance)}</Row>
      {e.hasMedicalInsurance && <Row label={t('fields.healthInsuranceCompanyId')}>{nameOf(options.companies, e.healthInsuranceCompanyId)}</Row>}
    </>
  );
}

function ContractDetails({ employee: e, options }: Props) {
  const { t } = useTranslation('employees');
  const withOther = (id: string | null, list: Option[], other: string | null) => `${nameOf(list, id) ?? ''}${other ? ` — ${other}` : ''}`;
  return (
    <SectionCard id="contract" title={t('sections.contract')}>
      <Row label={t('fields.startDate')}>{ltr(e.startDate)}</Row>
      <Row label={t('fields.endDate')}>{ltr(e.endDate)}</Row>
      <Row label={t('fields.contractTypeId')}>{withOther(e.contractTypeId, options.contractTypes, e.contractTypeOther)}</Row>
      <Row label={t('fields.contractCompanyId')}>{nameOf(options.companies, e.contractCompanyId)}</Row>
      <Row label={t('fields.profession')}>{e.profession}</Row>
      <InsuranceDetails employee={e} options={options} />
      {e.terminationReasonId && <Row label={t('fields.terminationReasonId')}>{withOther(e.terminationReasonId, options.terminationReasons, e.terminationReasonOther)}</Row>}
    </SectionCard>
  );
}

function SalaryDetails({ employee: e, options }: Props) {
  const { t } = useTranslation('employees');
  return (
    <SectionCard id="salary" title={t('sections.salary')}>
      <Row label={t('fields.monthlyGrossSalary')}>{ltr(e.monthlyGrossSalary)}</Row>
      <Row label={t('fields.salaryCurrencyCountryId')}>{nameOf(options.currencies, e.salaryCurrencyCountryId)}</Row>
      <Row label={t('fields.iban')}>{ltr(e.iban)}</Row>
    </SectionCard>
  );
}

function RolesDetails({ employee: e }: { employee: EmployeeDto }) {
  const { t, i18n } = useTranslation('employees');
  return (
    <SectionCard id="roles" title={t('sections.roles')}>
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        {e.roles.length === 0 && <span className="text-sm text-muted">—</span>}
        {e.roles.map((r) => <Badge key={r.id} tone="info">{i18n.language === 'en' ? r.nameEn : r.nameAr}</Badge>)}
      </div>
    </SectionCard>
  );
}

/** Read-only view of the form, section by section, with every option shown by name. */
export function DetailsSections({ employee, options }: Props) {
  const { t } = useTranslation('employees');
  return (
    <div className="flex flex-col gap-6">
      <WorkDetails employee={employee} options={options} />
      <ContactAndPersonalDetails employee={employee} options={options} />
      <ContractDetails employee={employee} options={options} />
      <RolesDetails employee={employee} />
      {!employee.sensitiveHidden && <SalaryDetails employee={employee} options={options} />}
      {employee.notes && <SectionCard id="notes" title={t('sections.notes')}><p className="text-sm sm:col-span-2">{employee.notes}</p></SectionCard>}
    </div>
  );
}
