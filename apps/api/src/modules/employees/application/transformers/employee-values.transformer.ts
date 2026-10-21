import { normalizeIban } from '@arweqah-platform/shared';
import { BlindIndex } from '../../../../common/application/blind-index';
import { FieldCipher } from '../../../../common/application/field-cipher';
import type { EmployeeValues } from '../../domain/types/employee.types';
import type { EmployeeInput } from '../../domain/rules/employee-flags.rules';

const n = <T>(value: T | null | undefined): T | null => value ?? null;
const trimmed = (value: string | null | undefined): string | null => (value ? value.trim() : null);

/** The database columns of an employee: optional fields become explicit nulls, sensitive ones are encrypted. */
export function toEmployeeValues(input: EmployeeInput, secrets: { cipher: FieldCipher; blind: BlindIndex }): EmployeeValues {
  return { ...plainValues(input), ...sensitiveValues(input, secrets) };
}

function sensitiveValues(input: EmployeeInput, secrets: { cipher: FieldCipher; blind: BlindIndex }): EmployeeValues {
  const idNumber = trimmed(input.idNumber);
  const iban = input.iban ? normalizeIban(input.iban) : null;
  return {
    idTypeId: idNumber ? n(input.idTypeId) : null,
    idNumberEnc: idNumber ? secrets.cipher.encrypt(idNumber) : null,
    idNumberHash: idNumber ? secrets.blind.of(idNumber) : null,
    monthlyGrossSalaryEnc: input.monthlyGrossSalary != null ? secrets.cipher.encrypt(input.monthlyGrossSalary.toFixed(2)) : null,
    salaryCurrencyCountryId: n(input.salaryCurrencyCountryId),
    ibanEnc: iban ? secrets.cipher.encrypt(iban) : null,
  };
}

// One declarative column map, one line per column; splitting it would only scatter the list.
// eslint-disable-next-line max-lines-per-function
function plainValues(input: EmployeeInput): EmployeeValues {
  return {
    companyId: input.companyId,
    relationTypeId: n(input.relationTypeId),
    orgNodeId: input.orgNodeId,
    jobTitleId: input.jobTitleId,
    managerId: n(input.managerId),
    workLocation: n(input.workLocation),
    workCountryId: n(input.workCountryId),
    workMode: n(input.workMode),
    workEmail: input.workEmail,
    personalEmail: n(input.personalEmail),
    workPhone: n(input.workPhone),
    personalPhone: n(input.personalPhone),
    employeeNumber: input.employeeNumber,
    fullName: input.fullName,
    fullNameEn: n(input.fullNameEn),
    gender: n(input.gender),
    birthDate: n(input.birthDate),
    nationalityId: n(input.nationalityId),
    maritalStatusId: n(input.maritalStatusId),
    residencyStatusId: n(input.residencyStatusId),
    idExpiryDate: n(input.idExpiryDate),
    startDate: input.startDate,
    endDate: n(input.endDate),
    contractTypeId: n(input.contractTypeId),
    contractTypeOther: n(input.contractTypeOther),
    contractCompanyId: n(input.contractCompanyId),
    gosiCompanyId: n(input.gosiCompanyId),
    healthInsuranceCompanyId: n(input.healthInsuranceCompanyId),
    isGosiRegistered: input.isGosiRegistered,
    gosiRegistrationDate: n(input.gosiRegistrationDate),
    gosiSystemId: n(input.gosiSystemId),
    profession: n(input.profession),
    isQiwaContract: input.isQiwaContract,
    hasMedicalInsurance: input.hasMedicalInsurance,
    terminationReasonId: n(input.terminationReasonId),
    terminationReasonOther: n(input.terminationReasonOther),
    notes: n(input.notes),
  };
}
