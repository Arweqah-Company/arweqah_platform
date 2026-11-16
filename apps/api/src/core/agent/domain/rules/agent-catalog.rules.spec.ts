import { describe, expect, it } from 'vitest';
import type { AgentRouteFacts } from '../types/agent-catalog.types';
import { exclusionReason, fieldsFromJsonSchema, httpMethodOf, joinPath, missingRequired, pathPlaceholders } from './agent-catalog.rules';

const route = (over: Partial<AgentRouteFacts> = {}): AgentRouteFacts => ({
  operationId: 'X.y',
  httpMethod: 'POST',
  path: '/tickets/setup/desks/:deskId/types',
  permission: 'tickets.type_create',
  adminMode: false,
  allowBeforeMfa: false,
  agentHidden: false,
  upload: false,
  unsupportedSchema: false,
  ...over,
});

describe('The assistant catalog rules (FR-135, FR-136)', () => {
  it('FR-136: an ordinary route with a key is kept', () => {
    expect(exclusionReason(route())).toBeNull();
  });

  it.each([
    ['hidden', { agentHidden: true }],
    ['no-permission', { permission: null }],
    ['admin-mode', { adminMode: true }],
    ['before-mfa', { allowBeforeMfa: true }],
    ['upload', { upload: true }],
    ['import', { path: '/employees/import' }],
    ['sensitive-area', { path: '/mfa/enroll' }],
    ['sensitive-area', { path: '/impersonation/start' }],
    ['unsupported-schema', { unsupportedSchema: true }],
  ] as const)('FR-136: leaves out a route for %s', (reason, over) => {
    expect(exclusionReason(route(over))).toBe(reason);
  });

  it('FR-136: «hidden» wins over every other reason', () => {
    expect(exclusionReason(route({ agentHidden: true, permission: null, adminMode: true }))).toBe('hidden');
  });

  it('turns Nest request methods into names and drops HEAD, OPTIONS and ALL', () => {
    expect([0, 1, 2, 3, 4].map(httpMethodOf)).toEqual(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']);
    expect([5, 6, 7].map(httpMethodOf)).toEqual([null, null, null]);
  });

  it('joins path pieces without doubles or trailing slashes', () => {
    expect(joinPath('tickets/setup', '/desks/:deskId/')).toBe('/tickets/setup/desks/:deskId');
    expect(joinPath('health', '')).toBe('/health');
  });

  it('FR-139: reads fields and mandatory ones from a JSON Schema, and the path placeholders', () => {
    const fields = fieldsFromJsonSchema('body', { properties: { nameAr: { type: 'string' }, note: { type: 'string' } }, required: ['nameAr'] });
    expect(fields).toEqual([
      { name: 'nameAr', place: 'body', required: true, schema: { type: 'string' } },
      { name: 'note', place: 'body', required: false, schema: { type: 'string' } },
    ]);
    expect(pathPlaceholders('/tickets/setup/desks/:deskId/types/:typeId')).toEqual(['deskId', 'typeId']);
  });

  it('FR-139: lists the mandatory fields still empty, and treats 0 and false as filled', () => {
    const fields = fieldsFromJsonSchema('body', { properties: { a: {}, b: {}, c: {}, d: {} }, required: ['a', 'b', 'c'] });
    expect(missingRequired(fields, { a: 'x', b: '', c: 0, d: undefined }).map((f) => f.name)).toEqual(['b']);
    expect(missingRequired(fields, {}).map((f) => f.name)).toEqual(['a', 'b', 'c']);
  });
});
