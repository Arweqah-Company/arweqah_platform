import type { AgentExclusionReason, AgentField, AgentFieldPlace, AgentHttpMethod, AgentRouteFacts } from '../types/agent-catalog.types';

/** Areas that never go through the chat: signing in, the second factor, «sign in as», files, health. */
const SENSITIVE_ROOTS = new Set(['agent', 'mfa', 'impersonation', 'admin-mode', 'captcha', 'files', 'health', 'auth']);

const METHODS: Record<number, AgentHttpMethod | undefined> = { 0: 'GET', 1: 'POST', 2: 'PUT', 3: 'DELETE', 4: 'PATCH' };

/** Nest's `RequestMethod` number to a method name; HEAD, OPTIONS and ALL are not actions. */
export function httpMethodOf(requestMethod: number): AgentHttpMethod | null {
  return METHODS[requestMethod] ?? null;
}

export function operationIdOf(controller: string, method: string): string {
  return `${controller}.${method}`;
}

/** Joins path pieces into one route path: leading slash, no doubles, no trailing slash. */
export function joinPath(...parts: string[]): string {
  const joined = parts.flatMap((part) => part.split('/')).filter(Boolean).join('/');
  return `/${joined}`;
}

function hasImportSegment(path: string): boolean {
  return path.split('/').some((segment) => segment === 'import' || segment === 'import-file');
}

/** Why a route must not reach the chat, or null when it may (FR-136). The first matching reason wins. */
export function exclusionReason(facts: AgentRouteFacts): AgentExclusionReason | null {
  if (facts.agentHidden) return 'hidden';
  if (facts.upload) return 'upload';
  if (facts.allowBeforeMfa) return 'before-mfa';
  if (facts.adminMode) return 'admin-mode';
  if (hasImportSegment(facts.path)) return 'import';
  if (SENSITIVE_ROOTS.has(facts.path.split('/')[1] ?? '')) return 'sensitive-area';
  if (!facts.permission) return 'no-permission';
  if (facts.unsupportedSchema) return 'unsupported-schema';
  return null;
}

interface ObjectSchema {
  properties?: Record<string, Record<string, unknown>>;
  required?: string[];
}

/** The fields an object JSON Schema describes; every one of them travels in `place`. */
export function fieldsFromJsonSchema(place: AgentFieldPlace, schema: ObjectSchema): AgentField[] {
  const required = new Set(schema.required ?? []);
  return Object.entries(schema.properties ?? {}).map(([name, value]) => ({ name, place, required: required.has(name), schema: value }));
}

/** Path placeholders (`:deskId`) are always required, even when a schema is missing for them. */
export function pathPlaceholders(path: string): string[] {
  return path.split('/').filter((segment) => segment.startsWith(':')).map((segment) => segment.slice(1));
}

/** Mandatory fields still empty in `values`: what the assistant must ask for before it proposes anything (FR-139). */
export function missingRequired(fields: readonly AgentField[], values: Readonly<Record<string, unknown>>): AgentField[] {
  return fields.filter((field) => field.required && (values[field.name] === undefined || values[field.name] === null || values[field.name] === ''));
}

/** A field in one phrase for the model: its name, its type and, when the values are limited, which ones (`status (string: open | closed)`). */
export function fieldBrief(field: AgentField): string {
  const schema = field.schema as { type?: unknown; enum?: unknown[]; anyOf?: { type?: string }[] };
  const type = typeof schema.type === 'string' ? schema.type : schema.anyOf?.map((a) => a.type).filter(Boolean).join(' or ') || 'value';
  const values = Array.isArray(schema.enum) ? `: ${schema.enum.join(' | ')}` : '';
  return `${field.name} (${type}${values})`;
}
