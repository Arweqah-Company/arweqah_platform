import 'reflect-metadata';
import { Injectable } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA, ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { RouteParamtypes } from '@nestjs/common/enums/route-paramtypes.enum';
import { Reflector } from '@nestjs/core';
import { z } from 'zod';
import { ALLOW_BEFORE_MFA, PAGE_KEY, REQUIRE_ADMIN_MODE, REQUIRED_PERMISSION } from '../../../access/domain/route-metadata-keys';
import { fieldsFromJsonSchema, httpMethodOf, joinPath, operationIdOf, pathPlaceholders } from '../../domain/rules/agent-catalog.rules';
import { AGENT_HIDDEN, AGENT_HINT, type AgentField, type AgentFieldPlace, type AgentRouteFacts } from '../../domain/types/agent-catalog.types';

type Handler = (...args: unknown[]) => unknown;
export type Constructor = abstract new (...args: never[]) => object;

/** One route as the controllers declare it: what the rules judge and the fields the assistant asks about. */
export interface ReadRoute {
  facts: AgentRouteFacts;
  fields: AgentField[];
  pageKey: string | null;
  hint: string | null;
  /** The zod schema of each place the route reads, to check what the assistant prepared before the employee is asked to confirm it. */
  schemas: Partial<Record<AgentFieldPlace, z.ZodType>>;
}

const PLACE_OF: Partial<Record<number, AgentFieldPlace>> = {
  [RouteParamtypes.BODY]: 'body',
  [RouteParamtypes.QUERY]: 'query',
  [RouteParamtypes.PARAM]: 'path',
};

/** A class made by `createZodDto`: it carries its zod schema. */
function isZodDto(value: unknown): value is { schema: z.ZodType } {
  return typeof value === 'function' && (value as { isZodDto?: boolean }).isZodDto === true;
}

function firstPath(target: object): string {
  const path = Reflect.getMetadata(PATH_METADATA, target) as string | string[] | undefined;
  return (Array.isArray(path) ? path[0] : path) ?? '';
}

function describe(place: AgentFieldPlace, schema: z.ZodType): AgentField[] | null {
  try {
    return fieldsFromJsonSchema(place, z.toJSONSchema(schema, { unrepresentable: 'any', io: 'input' }) as Parameters<typeof fieldsFromJsonSchema>[1]);
  } catch {
    return null;
  }
}

/** Reads the metadata of controller methods (route, key, flags, zod schemas) into plain facts. */
@Injectable()
export class AgentRouteReader {
  constructor(private readonly reflector: Reflector) {}

  /** The route a method serves, or null when the method is not a route (or is HEAD / OPTIONS / ALL). */
  read(controller: Constructor, prototype: object, method: string): ReadRoute | null {
    const handler = (prototype as Record<string, Handler>)[method];
    if (!handler) return null;
    const httpMethod = httpMethodOf(Reflect.getMetadata(METHOD_METADATA, handler) as number);
    if (!httpMethod || Reflect.getMetadata(PATH_METADATA, handler) === undefined) return null;
    const path = joinPath(firstPath(controller), firstPath(handler));
    const args = this.arguments(controller, prototype, method, path);
    const flag = (key: string) => !!this.meta<boolean>(key, handler, controller);
    return {
      pageKey: this.meta<string>(PAGE_KEY, handler, controller) ?? null,
      hint: this.meta<string>(AGENT_HINT, handler, controller) ?? null,
      fields: args.fields,
      schemas: args.schemas,
      facts: {
        operationId: operationIdOf(controller.name, method),
        httpMethod,
        path,
        permission: this.meta<string>(REQUIRED_PERMISSION, handler, controller) ?? null,
        adminMode: flag(REQUIRE_ADMIN_MODE),
        allowBeforeMfa: flag(ALLOW_BEFORE_MFA),
        agentHidden: flag(AGENT_HIDDEN),
        upload: args.upload,
        unsupportedSchema: args.unsupported,
      },
    };
  }

  private meta<T>(key: string, handler: Handler, controller: Constructor): T | undefined {
    return this.reflector.getAllAndOverride<T | undefined>(key, [handler, controller]);
  }

  /** Body, query and path fields from the zod DTO of each argument; `unsupported` when a schema cannot be written as JSON Schema. */
  private arguments(controller: Constructor, prototype: object, method: string, path: string): { fields: AgentField[]; upload: boolean; unsupported: boolean; schemas: ReadRoute['schemas'] } {
    const args = (Reflect.getMetadata(ROUTE_ARGS_METADATA, controller, method) ?? {}) as Record<string, { index: number }>;
    const types = (Reflect.getMetadata('design:paramtypes', prototype, method) ?? []) as unknown[];
    const kinds = Object.entries(args).map(([key, { index }]) => ({ kind: Number(key.split(':')[0]), dto: types[index] }));
    const described = kinds.map(({ kind, dto }) => ({ place: PLACE_OF[kind], dto })).filter((a) => a.place && isZodDto(a.dto));
    const parts = described.map((a) => describe(a.place!, (a.dto as { schema: z.ZodType }).schema));
    const fields = parts.flatMap((part) => part ?? []);
    for (const name of pathPlaceholders(path)) if (!fields.some((f) => f.place === 'path' && f.name === name)) fields.push({ name, place: 'path', required: true, schema: {} });
    const schemas: ReadRoute['schemas'] = {};
    for (const a of described) schemas[a.place!] = (a.dto as { schema: z.ZodType }).schema;
    return {
      fields,
      schemas,
      upload: kinds.some(({ kind }) => kind === RouteParamtypes.FILE || kind === RouteParamtypes.FILES),
      unsupported: parts.some((part) => part === null),
    };
  }
}
