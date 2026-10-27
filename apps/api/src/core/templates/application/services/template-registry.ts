import { Injectable } from '@nestjs/common';
import type { TemplateKind } from '@arweqah-platform/shared';
import type { TemplateDefinition } from '../../domain/types/template.types';

/**
 * The messages the code sends. Each module registers its own on start (like permissions), so this module knows none of
 * them and an administrator can edit exactly what some code can fill and send.
 */
@Injectable()
export class TemplateRegistry {
  private readonly byKey = new Map<string, TemplateDefinition>();

  register(definitions: TemplateDefinition[]): void {
    for (const def of definitions) this.byKey.set(`${def.kind}:${def.key}`, def);
  }

  get(kind: TemplateKind, key: string): TemplateDefinition | undefined {
    return this.byKey.get(`${kind}:${key}`);
  }

  all(kind: TemplateKind): TemplateDefinition[] {
    return [...this.byKey.values()].filter((d) => d.kind === kind);
  }
}
