import type { PermissionScope } from '@arweqah-platform/shared';
import { Column } from 'typeorm';

/** How far a grant reaches and, for a permission that carries a list of fields, which fields it covers (the key and the holder are declared by each table). */
export abstract class GrantReach {
  @Column({ type: 'varchar', length: 20 })
  scope: PermissionScope;

  /** The fields the grant lets its holder change (`employees.update`); null for permissions that carry no list. */
  @Column({ name: 'fields', type: 'text', array: true, nullable: true })
  fields: string[] | null;
}
