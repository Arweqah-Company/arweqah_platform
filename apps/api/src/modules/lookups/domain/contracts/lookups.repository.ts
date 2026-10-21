import type {
  ContractTypeLookupDto,
  CountryLookupDto,
  IdTypeLookupDto,
  Language,
  LookupItemDto,
  OtherFlagLookupDto,
} from '@arweqah-platform/shared';

/** Flags and rules the employee API enforces (the form gets the same data from GET /lookups). */
export interface ContractTypeRule {
  requiresEndDate: boolean;
  isOther: boolean;
}

export interface IdTypeRules {
  requiresCountry: boolean;
  rules: { countryId: string | null; regex: string; minLength: number; maxLength: number; messageAr: string; messageEn: string }[];
}

/** Reads the seeded option tables with their translations. `lang` only decides `name`; both languages are always returned. */
export abstract class LookupsRepository {
  abstract relationTypes(lang: Language): Promise<LookupItemDto[]>;
  abstract countries(lang: Language): Promise<CountryLookupDto[]>;
  abstract maritalStatuses(lang: Language): Promise<LookupItemDto[]>;
  abstract residencyStatuses(lang: Language): Promise<LookupItemDto[]>;
  abstract idTypes(lang: Language): Promise<IdTypeLookupDto[]>;
  abstract contractTypes(lang: Language): Promise<ContractTypeLookupDto[]>;
  abstract gosiSystems(lang: Language): Promise<LookupItemDto[]>;
  abstract terminationReasons(lang: Language): Promise<OtherFlagLookupDto[]>;
  abstract contractTypeRule(id: string): Promise<ContractTypeRule | null>;
  abstract idTypeRules(id: string): Promise<IdTypeRules | null>;
  abstract terminationReasonIsOther(id: string): Promise<boolean | null>;
}
