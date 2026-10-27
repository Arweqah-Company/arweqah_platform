import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { IntegrationKind, ProviderKey } from '@arweqah-platform/shared';
import { IntegrationProviderRepository } from '../../domain/contracts/integration-provider.repository';
import { IntegrationProvider } from '../../domain/entities/integration-provider.entity';

@Injectable()
export class TypeOrmIntegrationProviderRepository extends IntegrationProviderRepository {
  constructor(@InjectRepository(IntegrationProvider) private readonly rows: Repository<IntegrationProvider>) {
    super();
  }

  findAll(kind: IntegrationKind): Promise<IntegrationProvider[]> {
    return this.rows.find({ where: { kind } });
  }

  find(kind: IntegrationKind, providerKey: ProviderKey): Promise<IntegrationProvider | null> {
    return this.rows.findOne({ where: { kind, providerKey } });
  }

  findActive(kind: IntegrationKind): Promise<IntegrationProvider | null> {
    return this.rows.findOne({ where: { kind, isActive: true } });
  }

  save(row: Parameters<IntegrationProviderRepository['save']>[0]): Promise<IntegrationProvider> {
    return this.rows.save(this.rows.create(row));
  }

  async activate(kind: IntegrationKind, id: string): Promise<void> {
    await this.rows.manager.transaction(async (tx) => {
      await tx.update(IntegrationProvider, { kind, isActive: true }, { isActive: false });
      await tx.update(IntegrationProvider, { id }, { isActive: true });
    });
  }

  async deactivate(kind: IntegrationKind): Promise<void> {
    await this.rows.update({ kind, isActive: true }, { isActive: false });
  }
}
