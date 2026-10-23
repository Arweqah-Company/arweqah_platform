import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Role } from '../../core/access/domain/role.entity';
import { ROLE_SEEDS } from './data/roles.data';

/**
 * Creates the owner's list of roles once: only while no custom role exists, so roles an administrator renamed,
 * changed or deleted later do not come back on the next deploy. They start with no permissions (set from the roles page).
 */
@Injectable()
export class RolesCatalogSeeder {
  private readonly logger = new Logger('Seed');

  constructor(private readonly db: DataSource) {}

  async run(): Promise<void> {
    const repo = this.db.getRepository(Role);
    if ((await repo.count({ where: { isSystem: false } })) > 0) return;
    for (const seed of ROLE_SEEDS) {
      const role = Object.assign(new Role(), { nameAr: seed.ar, nameEn: seed.en, description: seed.note ?? null, isSystem: false, assignment: seed.assignment, autoRule: seed.autoRule ?? null, permissions: [] });
      await repo.save(role);
    }
    this.logger.log(`${ROLE_SEEDS.length} roles created from the owner's list`);
  }
}
