import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '@/core/permissions/can';
import { dropdownOf, type Choice } from '@/shared/data-exchange/mapping';
import type { ImportColumn, SheetRow } from '@/shared/data-exchange/types';
import { useOrgReference } from './api';
import { prepareEmployeeRows, REQUIRED, unitsOf, YES_NO } from './employees-import-rows';
import { useEmployeeOptions } from './form/use-options';

/** Sensitive columns are in the template only for people who may see them. */
const SENSITIVE = ['idNumber', 'monthlyGrossSalary', 'iban'];
/** Template column order: the sections of the form. */
const ORDER = ['companyId', 'relationTypeId', 'orgNodeId', 'jobTitleId', 'managerNumber', 'workLocation', 'workCountryId', 'workMode', 'workEmail', 'personalEmail', 'workPhone', 'personalPhone', 'employeeNumber', 'fullName', 'fullNameEn', 'gender', 'birthDate', 'nationalityId', 'maritalStatusId', 'residencyStatusId', 'idTypeId', 'idNumber', 'idExpiryDate', 'startDate', 'endDate', 'contractTypeId', 'contractTypeOther', 'contractCompanyId', 'isGosiRegistered', 'gosiCompanyId', 'gosiRegistrationDate', 'gosiSystemId', 'profession', 'isQiwaContract', 'hasMedicalInsurance', 'healthInsuranceCompanyId', 'monthlyGrossSalary', 'salaryCurrencyCountryId', 'iban', 'notes'];

type Named = { id: string; nameAr: string; nameEn: string };
const choicesOf = (items: Named[]): Choice[] => items.map((i) => ({ id: i.id, labels: [i.nameAr, i.nameEn] }));

/** Import of employees: the same fields as the form, every drop-down filled from the system's lists. */
export function useEmployeesImport() {
  const { t } = useTranslation('employees');
  const { t: common } = useTranslation();
  const client = useQueryClient();
  const options = useEmployeeOptions();
  const reference = useOrgReference(true).data ?? [];
  const sensitive = usePermissions().can('employees.view_sensitive');
  const { raw, companiesRaw } = options;

  const lists: Record<string, Choice[]> = {
    companyId: choicesOf(companiesRaw), contractCompanyId: choicesOf(companiesRaw), gosiCompanyId: choicesOf(companiesRaw), healthInsuranceCompanyId: choicesOf(companiesRaw),
    relationTypeId: choicesOf(raw.relationTypes), workCountryId: choicesOf(raw.countries), nationalityId: choicesOf(raw.countries), salaryCurrencyCountryId: choicesOf(raw.countries),
    maritalStatusId: choicesOf(raw.maritalStatuses), residencyStatusId: choicesOf(raw.residencyStatuses), idTypeId: choicesOf(raw.idTypes),
    contractTypeId: choicesOf(raw.contractTypes), gosiSystemId: choicesOf(raw.gosiSystems),
    gender: options.genders.map((g) => ({ id: g.value, labels: [g.label] })), workMode: options.workModes.map((m) => ({ id: m.value, labels: [m.label] })),
    orgNodeId: reference.flatMap((c) => unitsOf(reference, c.companyId)),
    jobTitleId: [...new Map(reference.flatMap((c) => c.units.flatMap((u) => u.titles)).map((x) => [x.nameAr, { id: x.id, labels: [x.nameAr, x.nameEn] }])).values()],
  };
  const yesNo = [common('dataExchange.yes'), common('dataExchange.no')];
  const columns: ImportColumn[] = ORDER.filter((id) => sensitive || !SENSITIVE.includes(id)).map((id) => ({
    id,
    header: id === 'managerNumber' ? t('import.managerNumber') : t(`fields.${id}`),
    required: REQUIRED.includes(id),
    options: YES_NO.includes(id) ? yesNo : lists[id] ? dropdownOf(lists[id]) : undefined,
  }));
  const headers = Object.fromEntries(columns.map((c) => [c.id, c.header]));

  return {
    filename: 'employees',
    columns,
    prepare: (rows: SheetRow[]) => prepareEmployeeRows(rows, { lists, reference, headers, t: common }),
    onImported: () => void client.invalidateQueries({ queryKey: ['employees'] }),
  };
}
