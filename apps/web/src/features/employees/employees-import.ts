import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '@/core/permissions/can';
import { dropdownOf, type Choice } from '@/shared/data-exchange/mapping';
import type { ImportColumn, SheetRow } from '@/shared/data-exchange/types';
import { useOrgReference } from './api';
import { prepareEmployeeRows, REQUIRED, unitsOf, YES_NO } from './employees-import-rows';
import { prepareUpdateRows, UPDATE_EXCLUDED } from './employees-update-import';
import { useEmployeeOptions } from './form/use-options';

/** Sensitive columns are in the template only for people who may see them. */
const SENSITIVE = ['idNumber', 'monthlyGrossSalary', 'iban'];
/** Template column order: the sections of the form. */
const ORDER = ['companyId', 'relationTypeId', 'orgNodeId', 'jobTitleId', 'managerNumber', 'workLocation', 'workCountryId', 'workMode', 'workEmail', 'personalEmail', 'workPhone', 'personalPhone', 'employeeNumber', 'fullName', 'fullNameEn', 'gender', 'birthDate', 'nationalityId', 'maritalStatusId', 'residencyStatusId', 'idTypeId', 'idNumber', 'idExpiryDate', 'startDate', 'endDate', 'contractTypeId', 'contractTypeOther', 'contractCompanyId', 'isGosiRegistered', 'gosiCompanyId', 'gosiRegistrationDate', 'gosiSystemId', 'profession', 'isQiwaContract', 'hasMedicalInsurance', 'healthInsuranceCompanyId', 'monthlyGrossSalary', 'salaryCurrencyCountryId', 'iban', 'notes'];

type Named = { id: string; nameAr: string; nameEn: string };
const choicesOf = (items: Named[]): Choice[] => items.map((i) => ({ id: i.id, labels: [i.nameAr, i.nameEn] }));

/** Every option list of the template by column id, read from the system's lists (names in both languages). */
function useImportLists(): Record<string, Choice[]> {
  const options = useEmployeeOptions();
  const reference = useOrgReference(true).data ?? [];
  const { raw, companiesRaw } = options;
  return {
    companyId: choicesOf(companiesRaw), contractCompanyId: choicesOf(companiesRaw), gosiCompanyId: choicesOf(companiesRaw), healthInsuranceCompanyId: choicesOf(companiesRaw),
    relationTypeId: choicesOf(raw.relationTypes), workCountryId: choicesOf(raw.countries), nationalityId: choicesOf(raw.countries), salaryCurrencyCountryId: choicesOf(raw.countries),
    maritalStatusId: choicesOf(raw.maritalStatuses), residencyStatusId: choicesOf(raw.residencyStatuses), idTypeId: choicesOf(raw.idTypes),
    contractTypeId: choicesOf(raw.contractTypes), gosiSystemId: choicesOf(raw.gosiSystems),
    gender: options.genders.map((g) => ({ id: g.value, labels: [g.label] })), workMode: options.workModes.map((m) => ({ id: m.value, labels: [m.label] })),
    orgNodeId: reference.flatMap((c) => unitsOf(reference, c.companyId)),
    jobTitleId: [...new Map(reference.flatMap((c) => c.units.flatMap((u) => u.titles)).map((x) => [x.nameAr, { id: x.id, labels: [x.nameAr, x.nameEn] }])).values()],
  };
}

/** Import of employees: the same fields as the form, every drop-down filled from the system's lists; and the update mode that changes the people a file names. */
export function useEmployeesImport() {
  const { t } = useTranslation('employees');
  const { t: common } = useTranslation();
  const client = useQueryClient();
  const reference = useOrgReference(true).data ?? [];
  const { can } = usePermissions();
  const lists = useImportLists();
  const sensitive = can('employees.view_sensitive');
  const yesNo = [common('dataExchange.yes'), common('dataExchange.no')];
  const columnsFor = (ids: string[], required: string[]): ImportColumn[] =>
    ids.filter((id) => sensitive || !SENSITIVE.includes(id)).map((id) => ({
      id,
      header: id === 'managerNumber' ? t('import.managerNumber') : t(`fields.${id}`),
      required: required.includes(id),
      options: YES_NO.includes(id) ? yesNo : lists[id] ? dropdownOf(lists[id]) : undefined,
    }));
  const columns = columnsFor(ORDER, REQUIRED);
  const updateColumns = columnsFor(ORDER.filter((id) => !UPDATE_EXCLUDED.includes(id)), ['employeeNumber']);
  const headersOf = (list: ImportColumn[]) => Object.fromEntries(list.map((c) => [c.id, c.header]));
  const onImported = () => void client.invalidateQueries({ queryKey: ['employees'] });
  const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' });

  return {
    /** Add the people a file lists (for who may add employees). */
    importing: can('employees.create') ? { filename: 'employees', columns, prepare: (rows: SheetRow[]) => prepareEmployeeRows(rows, { lists, reference, headers: headersOf(columns), t: common }), onImported } : undefined,
    /** Update the people a file names by number: what a row fills changes, an empty cell changes nothing (for who may edit employees). */
    updating: can('employees.update') ? {
      filename: 'employees-update',
      columns: updateColumns,
      prepare: (rows: SheetRow[]) => prepareUpdateRows(rows, { lists, reference, headers: headersOf(updateColumns), t: common }, today()),
      onImported,
      title: t('import.updateTitle'),
      description: t('import.updateDescription'),
    } : undefined,
  };
}
