/** Languages the product is translated into. Arabic is the fallback. */
export const LANGUAGES = ['ar', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

/** A seeded option shown in a select, translated by the API. */
export interface LookupItemDto {
  id: string;
  code: string;
  name: string;
  nameAr: string;
  nameEn: string;
  sortOrder: number;
}

export interface CountryLookupDto extends LookupItemDto {
  isoCode: string;
  currencyCode: string;
  currencyName: string;
}

export interface IdTypeRuleDto {
  countryId: string | null;
  regex: string;
  minLength: number;
  maxLength: number;
  checksum: 'luhn' | null;
  errorMessage: string;
  errorMessageAr: string;
  errorMessageEn: string;
}

export interface IdTypeLookupDto extends LookupItemDto {
  requiresCountry: boolean;
  rules: IdTypeRuleDto[];
}

export interface ContractTypeLookupDto extends LookupItemDto {
  requiresEndDate: boolean;
  isOther: boolean;
}

/** A relation with limited access (a collaborator): the Employee role is replaced by the collaborator base and the contract end date is required. */
export interface RelationTypeLookupDto extends LookupItemDto {
  limitedAccess: boolean;
}

export interface OtherFlagLookupDto extends LookupItemDto {
  isOther: boolean;
}

/** Everything the employee form needs in one response: flags and rules come from here, not from code. */
export interface LookupsDto {
  relationTypes: RelationTypeLookupDto[];
  countries: CountryLookupDto[];
  maritalStatuses: LookupItemDto[];
  residencyStatuses: LookupItemDto[];
  idTypes: IdTypeLookupDto[];
  contractTypes: ContractTypeLookupDto[];
  gosiSystems: LookupItemDto[];
  terminationReasons: OtherFlagLookupDto[];
}

export interface OrgNodeOptionDto {
  id: string;
  /** Full path, e.g. "Business sector › IT › Development › Backend unit". */
  path: string;
  pathAr: string;
  pathEn: string;
  /** The unit's own name, for drop-downs that show the name only. */
  nameAr: string;
  nameEn: string;
  /** Default direct manager of the unit (employee id) when set, else the nearest ancestor's. */
  defaultManagerId: string | null;
}

export interface JobTitleOptionDto {
  id: string;
  name: string;
  nameAr: string;
  nameEn: string;
}

/** Every company's assignable units with their job titles: what an import template offers in its drop-downs. */
export interface OrgReferenceDto {
  companyId: string;
  units: (OrgNodeOptionDto & { titles: JobTitleOptionDto[] })[];
}

export interface ManagerOptionDto {
  id: string;
  employeeNumber: string;
  fullName: string;
}
