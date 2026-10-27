import { Column, Entity, Index } from 'typeorm';
import type { IntegrationKind, ProviderKey, ProviderValues } from '@arweqah-platform/shared';
import { BaseEntity } from '../../../../common/domain/base.entity';

/**
 * The data of one outside provider (translation or e-mail). One row per provider; at most one row per kind is active.
 * Secret fields inside `config` are encrypted; `verifiedHash` is the fingerprint of the data that last passed a test.
 */
@Entity('integration_providers')
@Index('uq_integration_provider', ['kind', 'providerKey'], { unique: true })
@Index('uq_integration_active_per_kind', ['kind'], { unique: true, where: '"is_active"' })
export class IntegrationProvider extends BaseEntity {
  @Column({ type: 'varchar', length: 20 })
  kind: IntegrationKind;

  @Column({ name: 'provider_key', type: 'varchar', length: 30 })
  providerKey: ProviderKey;

  @Column({ type: 'jsonb', default: () => `'{}'` })
  config: ProviderValues;

  @Column({ name: 'verified_hash', type: 'varchar', length: 64, nullable: true })
  verifiedHash: string | null;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt: Date | null;

  @Column({ name: 'is_active', type: 'boolean', default: false })
  isActive: boolean;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;
}
