import type { BilingualName, EmployeeNamesDto, LookupItemDto, LookupsDto } from '@arweqah-platform/shared';
import type { Employee } from '../../domain/entities/employee.entity';

const nameOf = (item: BilingualName | null | undefined): BilingualName | null => (item ? { nameAr: item.nameAr, nameEn: item.nameEn } : null);
const find = <T extends LookupItemDto>(list: T[], id: string | null): T | null => (id ? (list.find((i) => i.id === id) ?? null) : null);

/** The names behind the ids of an employee, taken from the seeded lists and the companies (the view page needs no drop-down list). */
export function employeeNames(e: Employee, lookups: LookupsDto, companies: Map<string, BilingualName>): EmployeeNamesDto {
  const currency = find(lookups.countries, e.salaryCurrencyCountryId);
  return {
    relationType: nameOf(find(lookups.relationTypes, e.relationTypeId)),
    workCountry: nameOf(find(lookups.countries, e.workCountryId)),
    nationality: nameOf(find(lookups.countries, e.nationalityId)),
    maritalStatus: nameOf(find(lookups.maritalStatuses, e.maritalStatusId)),
    residencyStatus: nameOf(find(lookups.residencyStatuses, e.residencyStatusId)),
    idType: nameOf(find(lookups.idTypes, e.idTypeId)),
    contractType: nameOf(find(lookups.contractTypes, e.contractTypeId)),
    contractCompany: nameOf(e.contractCompanyId ? companies.get(e.contractCompanyId) : null),
    gosiCompany: nameOf(e.gosiCompanyId ? companies.get(e.gosiCompanyId) : null),
    healthInsuranceCompany: nameOf(e.healthInsuranceCompanyId ? companies.get(e.healthInsuranceCompanyId) : null),
    gosiSystem: nameOf(find(lookups.gosiSystems, e.gosiSystemId)),
    terminationReason: nameOf(find(lookups.terminationReasons, e.terminationReasonId)),
    salaryCurrency: currency ? { ...nameOf(currency)!, currencyCode: currency.currencyCode, currencyName: currency.currencyName } : null,
  };
}
