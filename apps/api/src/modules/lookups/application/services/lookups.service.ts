import { Injectable } from '@nestjs/common';
import type { IdTypeRules, JobTitleOptionDto, Language, LookupsDto, ManagerOptionDto, OrgNodeOptionDto, OrgReferenceDto } from '@arweqah-platform/shared';
import { OrgDirectoryService } from '../../../org/application/services/org-directory.service';
import { LookupsRepository, type ContractTypeRule } from '../../domain/contracts/lookups.repository';

export interface CompanyOptionDto {
  id: string;
  code: string;
  name: string;
  nameAr: string;
  nameEn: string;
}

/** What the employee form loads: seeded options plus the dynamic company structure. */
@Injectable()
export class LookupsService {
  constructor(
    private readonly repo: LookupsRepository,
    private readonly org: OrgDirectoryService,
  ) {}

  async all(lang: Language): Promise<LookupsDto> {
    const [relationTypes, countries, maritalStatuses, residencyStatuses, idTypes, contractTypes, gosiSystems, terminationReasons] = await Promise.all([
      this.repo.relationTypes(lang),
      this.repo.countries(lang),
      this.repo.maritalStatuses(lang),
      this.repo.residencyStatuses(lang),
      this.repo.idTypes(lang),
      this.repo.contractTypes(lang),
      this.repo.gosiSystems(lang),
      this.repo.terminationReasons(lang),
    ]);
    return { relationTypes, countries, maritalStatuses, residencyStatuses, idTypes, contractTypes, gosiSystems, terminationReasons };
  }

  async companies(lang: Language): Promise<CompanyOptionDto[]> {
    return (await this.org.companyOptions()).map((c) => ({ id: c.id, code: c.code, name: lang === 'en' ? c.nameEn : c.nameAr, nameAr: c.nameAr, nameEn: c.nameEn }));
  }

  /** The structure is the group's, so the units are the same whichever company asks (the parameter is kept for the clients that send it). */
  orgNodes(_companyId: string): Promise<OrgNodeOptionDto[]> {
    return this.org.nodeOptions();
  }

  async orgReference(): Promise<OrgReferenceDto[]> {
    const companies = await this.org.companyOptions();
    const units = await Promise.all((await this.org.nodeOptions()).map(async (unit) => ({ ...unit, titles: await this.org.titleOptions(unit.id) })));
    return companies.map((c) => ({ companyId: c.id, units }));
  }

  jobTitles(orgNodeId: string): Promise<JobTitleOptionDto[]> {
    return this.org.titleOptions(orgNodeId);
  }

  // Rules the employee API enforces; null means the id does not exist.
  contractTypeRule(id: string): Promise<ContractTypeRule | null> {
    return this.repo.contractTypeRule(id);
  }

  idTypeRules(id: string): Promise<IdTypeRules | null> {
    return this.repo.idTypeRules(id);
  }

  terminationReasonIsOther(id: string): Promise<boolean | null> {
    return this.repo.terminationReasonIsOther(id);
  }

  relationTypeLimited(id: string): Promise<boolean | null> {
    return this.repo.relationTypeLimited(id);
  }
}

export type { ManagerOptionDto };
