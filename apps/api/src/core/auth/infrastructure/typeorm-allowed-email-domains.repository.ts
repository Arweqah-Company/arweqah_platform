import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AllowedEmailDomainsRepository } from '../domain/allowed-email-domains.repository';

@Injectable()
export class TypeOrmAllowedEmailDomainsRepository extends AllowedEmailDomainsRepository {
  constructor(private readonly ds: DataSource) {
    super();
  }

  async all(): Promise<string[]> {
    return (await this.ds.query<{ domain: string }[]>('SELECT domain FROM allowed_email_domains ORDER BY domain')).map((r) => r.domain);
  }

  async replace(domains: string[], createdBy: string | null): Promise<void> {
    await this.ds.transaction(async (m) => {
      await m.query('DELETE FROM allowed_email_domains');
      for (const domain of domains) await m.query('INSERT INTO allowed_email_domains (domain, created_by) VALUES ($1, $2)', [domain, createdBy]);
    });
  }
}
