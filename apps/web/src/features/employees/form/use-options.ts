import type { ComboboxOption } from '@/shared/ui';
import { useTranslation } from 'react-i18next';
import type { LookupsDto } from '@arweqah-platform/shared';
import { useCompanyOptions, useLookups } from '../api';

const NO_LOOKUPS: LookupsDto = { relationTypes: [], countries: [], maritalStatuses: [], residencyStatuses: [], idTypes: [], contractTypes: [], gosiSystems: [], terminationReasons: [] };

interface Named {
  id: string;
  nameAr: string;
  nameEn: string;
}

/** The select options of the employee form, labelled in the language of the screen. */
export function useEmployeeOptions() {
  const { t, i18n } = useTranslation('employees');
  const lookups = useLookups();
  const companies = useCompanyOptions();
  const label = (item: Named) => (i18n.language === 'en' ? item.nameEn : item.nameAr);
  const options = (items: Named[]): ComboboxOption[] => items.map((i) => ({ value: i.id, label: label(i) }));
  const data = lookups.data ?? NO_LOOKUPS;
  return {
    ready: !!lookups.data && !!companies.data,
    /** The lists as the API returns them (both languages), for places that match by any spelling. */
    raw: data,
    companiesRaw: companies.data ?? [],
    label,
    companies: options(companies.data ?? []),
    relationTypes: options(data.relationTypes),
    countries: options(data.countries),
    /** One currency per country, labelled "Saudi Riyal (SAR)"; the value is the country id the API stores. */
    currencies: data.countries.map((c) => ({ value: c.id, label: `${i18n.language === 'en' ? c.nameEn : c.nameAr} · ${c.currencyName} (${c.currencyCode})` })),
    maritalStatuses: options(data.maritalStatuses),
    residencyStatuses: options(data.residencyStatuses),
    idTypes: options(data.idTypes),
    contractTypes: options(data.contractTypes),
    gosiSystems: options(data.gosiSystems),
    terminationReasons: options(data.terminationReasons),
    genders: [{ value: '0', label: t('gender.male') }, { value: '1', label: t('gender.female') }],
    workModes: [{ value: '0', label: t('workMode.onsite') }, { value: '1', label: t('workMode.hybrid') }, { value: '2', label: t('workMode.remote') }],
    /** A relation with limited access (a collaborator). */
    relationLimited: (id: string) => data.relationTypes.find((r) => r.id === id)?.limitedAccess === true,
    contractType: (id: string) => data.contractTypes.find((c) => c.id === id),
    terminationReason: (id: string) => data.terminationReasons.find((r) => r.id === id),
    countryById: (id: string) => data.countries.find((c) => c.id === id),
  };
}

export type EmployeeOptions = ReturnType<typeof useEmployeeOptions>;
