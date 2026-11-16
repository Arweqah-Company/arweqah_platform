import { Injectable } from '@nestjs/common';
import { DiscoveryService, MetadataScanner } from '@nestjs/core';
import { PermissionCatalog } from '../../../access/application/permission-catalog';
import type { AccessContext } from '../../../access/domain/access-context';
import { exclusionReason } from '../../domain/rules/agent-catalog.rules';
import type { AgentAction, AgentExcludedRoute, AgentFieldPlace } from '../../domain/types/agent-catalog.types';
import { AgentRouteReader, type Constructor, type ReadRoute } from './agent-route-reader';

interface Built {
  actions: AgentAction[];
  excluded: AgentExcludedRoute[];
  schemas: Map<string, ReadRoute['schemas']>;
}

export type ValidatedInput = { ok: true } | { ok: false; issues: string[] };

/**
 * The assistant's catalog of actions (FR-135): every route that carries a permission key, read from the controllers' own metadata
 * (route, key, zod schemas), so a new route reaches the chat with no list to keep. Rules in `agent-catalog.rules.ts` keep out
 * what must not go through a chat (FR-136); `forContext` narrows it to what one person may do (FR-137).
 * Built on first use, after every module has started.
 */
@Injectable()
export class AgentCatalogService {
  private built: Built | null = null;

  constructor(
    private readonly discovery: DiscoveryService,
    private readonly scanner: MetadataScanner,
    private readonly reader: AgentRouteReader,
    private readonly permissions: PermissionCatalog,
  ) {}

  /** Every action of the platform, for every holder (used by tests and tools, never sent to a model as is). */
  all(): AgentAction[] {
    return this.build().actions;
  }

  /** The routes left out and why, so a missing action is explained, not guessed. */
  excluded(): AgentExcludedRoute[] {
    return this.build().excluded;
  }

  find(operationId: string): AgentAction | undefined {
    return this.build().actions.find((action) => action.operationId === operationId);
  }

  /** Only what this person holds the key for; the key's scope is checked again when the route runs. */
  forContext(ctx: AccessContext): AgentAction[] {
    return this.build().actions.filter((action) => ctx.has(action.permission));
  }

  /** Checks what the assistant prepared against the route's own zod schemas, so the employee is only asked to confirm something that can run (FR-139). */
  validate(operationId: string, input: Record<AgentFieldPlace, Record<string, unknown>>): ValidatedInput {
    const schemas = this.build().schemas.get(operationId) ?? {};
    const issues: string[] = [];
    for (const place of ['path', 'query', 'body'] as const) {
      const result = schemas[place]?.safeParse(input[place]);
      if (result && !result.success) issues.push(...result.error.issues.map((i) => `${[place, ...i.path].join('.')}: ${i.message}`));
    }
    return issues.length ? { ok: false, issues } : { ok: true };
  }

  private build(): Built {
    this.built ??= this.scan();
    return this.built;
  }

  private scan(): Built {
    const built: Built = { actions: [], excluded: [], schemas: new Map() };
    for (const route of this.routes()) {
      const reason = exclusionReason(route.facts);
      if (reason || !route.facts.permission) built.excluded.push(this.toExcluded(route, reason ?? 'no-permission'));
      else {
        built.actions.push(this.toAction(route, route.facts.permission));
        built.schemas.set(route.facts.operationId, route.schemas);
      }
    }
    built.actions.sort((a, b) => a.operationId.localeCompare(b.operationId));
    return built;
  }

  private routes(): ReadRoute[] {
    const routes: ReadRoute[] = [];
    for (const wrapper of this.discovery.getControllers()) {
      const prototype = wrapper.instance ? Object.getPrototypeOf(wrapper.instance) : null;
      if (!wrapper.metatype || !prototype) continue;
      for (const method of this.scanner.getAllMethodNames(prototype)) {
        const route = this.reader.read(wrapper.metatype as Constructor, prototype, method);
        if (route) routes.push(route);
      }
    }
    return routes;
  }

  private toExcluded(route: ReadRoute, reason: AgentExcludedRoute['reason']): AgentExcludedRoute {
    const permission = route.facts.permission;
    const label = permission ? this.permissions.all().find((def) => def.key === permission) : undefined;
    return { operationId: route.facts.operationId, reason, permission, labelAr: label?.labelAr ?? null, labelEn: label?.labelEn ?? null };
  }

  private toAction(route: ReadRoute, permission: string): AgentAction {
    const label = this.permissions.all().find((def) => def.key === permission);
    return {
      operationId: route.facts.operationId,
      kind: route.facts.httpMethod === 'GET' ? 'read' : 'write',
      httpMethod: route.facts.httpMethod,
      path: route.facts.path,
      permission,
      pageKey: route.pageKey,
      hint: route.hint,
      labelAr: label?.labelAr ?? permission,
      labelEn: label?.labelEn ?? permission,
      fields: route.fields,
    };
  }
}
