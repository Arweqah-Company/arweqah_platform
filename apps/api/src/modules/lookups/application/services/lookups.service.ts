import { Injectable } from '@nestjs/common';
import type { JobTitleOptionDto, Language, LookupsDto, ManagerOptionDto, OrgNodeOptionDto, OrgReferenceDto } from '@arweqah-platform/shared';
import { OrgDirectoryService } from '../../../org/application/services/org-directory.service';
import { LookupsRepository, type ContractTypeRule, type IdTypeRules } from '../../domain/contracts/lookups.repository';

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

  orgNodes(companyId: string): Promise<OrgNodeOptionDto[]> {
    return this.org.nodeOptions(companyId);
  }

  async orgReference(): Promise<OrgReferenceDto[]> {
    const companies = await this.org.companyOptions();
    return Promise.all(
      companies.map(async (c) => ({
        companyId: c.id,
        units: await Promise.all((await this.org.nodeOptions(c.id)).map(async (unit) => ({ ...unit, titles: await this.org.titleOptions(unit.id) }))),
      })),
    );
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
}

export type { ManagerOptionDto };
