import { Injectable, Logger } from '@nestjs/common';
import { CompaniesService } from '../../modules/org/application/services/companies.service';
import { COMPANIES } from './data/lookups.data';

/** Creates the group's companies. Existing companies are left untouched (the structure is one for the whole group). */
@Injectable()
export class CompaniesSeeder {
  private readonly logger = new Logger('Seed');

  constructor(private readonly companies: CompaniesService) {}

  async run(): Promise<void> {
    const existing = new Set((await this.companies.list()).map((c) => c.code));
    for (const company of COMPANIES.filter((c) => !existing.has(c.code))) {
      await this.companies.create({ code: company.code, nameAr: company.ar, nameEn: company.en, isActive: true }, null);
      this.logger.log(`Company created: ${company.code} ${company.en}`);
    }
  }
}
