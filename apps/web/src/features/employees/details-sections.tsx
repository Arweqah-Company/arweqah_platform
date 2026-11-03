import type { BilingualName, EmployeeDto } from '@arweqah-platform/shared';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge, SectionCard } from '@/shared/ui';

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div>
    <dt className="text-xs text-muted">{label}</dt>
    <dd className="mt-0.5 min-h-6 text-sm">{children || <span className="text-muted">—</span>}</dd>
  </div>
);

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
      <Row label={t('fields.companyId')}>{ar ? e.company.nameAr : e.company.nameEn}</Row>
      <Row label={t('fields.relationTypeId')}>{name(e.names.relationType)}</Row>
      <Row label={t('fields.orgNodeId')}>{e.orgNode && (ar ? e.orgNode.pathAr : e.orgNode.pathEn)}</Row>
      <Row label={t('fields.jobTitleId')}>{e.jobTitle && (ar ? e.jobTitle.nameAr : e.jobTitle.nameEn)}</Row>
      <Row label={t('fields.managerId')}>{e.manager?.fullName}</Row>
      <Row label={t('fields.workLocation')}>{e.workLocation}</Row>
      <Row label={t('fields.workCountryId')}>{name(e.names.workCountry)}</Row>
      <Row label={t('fields.workMode')}>{e.workMode === null ? null : t(['workMode.onsite', 'workMode.hybrid', 'workMode.remote'][e.workMode] ?? '')}</Row>
    </SectionCard>
  );
}

function ContactAndPersonalDetails({ employee: e }: Props) {
  const { t } = useTranslation('employees');
  const name = useName();
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
        <Row label={t('fields.gender')}>{e.gender === null ? null : t(e.gender === 0 ? 'gender.male' : 'gender.female')}</Row>
        <Row label={t('fields.birthDate')}>{ltr(e.birthDate)}</Row>
        <Row label={t('fields.nationalityId')}>{name(e.names.nationality)}</Row>
        <Row label={t('fields.maritalStatusId')}>{name(e.names.maritalStatus)}</Row>
        <Row label={t('fields.residencyStatusId')}>{name(e.names.residencyStatus)}</Row>
        <Row label={t('fields.idTypeId')}>{name(e.names.idType)}</Row>
        <Row label={t('fields.idNumber')}>{ltr(e.idNumber)}</Row>
        <Row label={t('fields.idExpiryDate')}>{ltr(e.idExpiryDate)}</Row>
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
      <Row label={t('fields.isGosiRegistered')}>{yes(e.isGosiRegistered)}</Row>
      {e.isGosiRegistered && (
        <>
          <Row label={t('fields.gosiCompanyId')}>{name(e.names.gosiCompany)}</Row>
          <Row label={t('fields.gosiRegistrationDate')}>{ltr(e.gosiRegistrationDate)}</Row>
          <Row label={t('fields.gosiSystemId')}>{name(e.names.gosiSystem)}</Row>
        </>
      )}
      <Row label={t('fields.isQiwaContract')}>{yes(e.isQiwaContract)}</Row>
      <Row label={t('fields.hasMedicalInsurance')}>{yes(e.hasMedicalInsurance)}</Row>
      {e.hasMedicalInsurance && <Row label={t('fields.healthInsuranceCompanyId')}>{name(e.names.healthInsuranceCompany)}</Row>}
    </>
  );
}

function ContractDetails({ employee: e }: Props) {
  const { t } = useTranslation('employees');
  const name = useName();
  const withOther = (value: BilingualName | null, other: string | null) => `${name(value) ?? ''}${other ? ` — ${other}` : ''}`;
  return (
    <SectionCard id="contract" title={t('sections.contract')}>
      <Row label={t('fields.startDate')}>{ltr(e.startDate)}</Row>
      <Row label={t('fields.endDate')}>{ltr(e.endDate)}</Row>
      <Row label={t('fields.contractTypeId')}>{withOther(e.names.contractType, e.contractTypeOther)}</Row>
      <Row label={t('fields.contractCompanyId')}>{name(e.names.contractCompany)}</Row>
      <Row label={t('fields.profession')}>{e.profession}</Row>
      <InsuranceDetails employee={e} />
      {e.terminationReasonId && <Row label={t('fields.terminationReasonId')}>{withOther(e.names.terminationReason, e.terminationReasonOther)}</Row>}
    </SectionCard>
  );
}

function SalaryDetails({ employee: e }: Props) {
  const { t } = useTranslation('employees');
  const name = useName();
  const currencyLabel = (c: EmployeeDto['names']['salaryCurrency']) => (c ? `${name(c)} · ${c.currencyName} (${c.currencyCode})` : null);
  return (
    <SectionCard id="salary" title={t('sections.salary')}>
      <Row label={t('fields.monthlyGrossSalary')}>{ltr(e.monthlyGrossSalary)}</Row>
      <Row label={t('fields.salaryCurrencyCountryId')}>{currencyLabel(e.names.salaryCurrency)}</Row>
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
export function DetailsSections({ employee }: Props) {
  const { t } = useTranslation('employees');
  return (
    <div className="flex flex-col gap-6">
      <WorkDetails employee={employee} />
      <ContactAndPersonalDetails employee={employee} />
      <ContractDetails employee={employee} />
      <RolesDetails employee={employee} />
      {!employee.sensitiveHidden && <SalaryDetails employee={employee} />}
      {employee.notes && <SectionCard id="notes" title={t('sections.notes')}><p className="text-sm sm:col-span-2">{employee.notes}</p></SectionCard>}
    </div>
  );
}
