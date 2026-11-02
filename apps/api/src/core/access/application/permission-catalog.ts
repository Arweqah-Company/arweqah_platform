import { Injectable } from '@nestjs/common';
import {
  baseScopeOf,
  type PermissionCatalogGroup,
  type PermissionDefinition,
  type PermissionGrant,
} from '@arweqah-platform/shared';
import { ScopeNotAllowedError, UnknownPermissionError } from '../domain/errors';

/**
 * Registry of every permission the running modules declare (Registry pattern).
 * Each module registers its definitions on init; roles may only reference these.
 */
@Injectable()
export class PermissionCatalog {
  private readonly definitions = new Map<string, PermissionDefinition>();

  register(definitions: PermissionDefinition[]): void {
    for (const def of definitions) {
      if (this.definitions.has(def.key)) throw new Error(`Duplicate permission ${def.key}`);
      this.definitions.set(def.key, def);
    }
  }

  all(): PermissionDefinition[] {
    return [...this.definitions.values()];
  }

  grouped(): PermissionCatalogGroup[] {
    const groups = new Map<string, PermissionDefinition[]>();
    for (const def of this.definitions.values()) {
      groups.set(def.module, [...(groups.get(def.module) ?? []), def]);
    }
    return [...groups].map(([module, permissions]) => ({ module, permissions }));
  }

  assertValid(grants: PermissionGrant[]): void {
    for (const grant of grants) {
      const def = this.definitions.get(grant.key);
      if (!def) throw new UnknownPermissionError(grant.key);
      if (!def.scopes.includes(baseScopeOf(grant.scope))) throw new ScopeNotAllowedError(grant.key, grant.scope);
    }
  }
}
