import { CorePermission } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { AccessContextService } from '../src/core/access/application/access-context.service';
import { AgentCatalogService } from '../src/core/agent/application/services/agent-catalog.service';
import { useTestApp } from './setup/test-app';

const DESKS_ID = 'TicketSetupController.desks';

describe('The assistant catalog, built from the routes (FR-135 to FR-137)', () => {
  const t = useTestApp();
  const catalog = () => t.app.get(AgentCatalogService);
  const byId = (id: string) => catalog().all().find((a) => a.operationId === id);
  const contextOf = async (keys: string[]) => {
    const user = await t.factories.user({ grants: keys.map((key) => ({ key, scope: 'all' as const })) });
    return (await t.app.get(AccessContextService).forUser(user.id))!;
  };

  it('FR-135: «add a ticket type» is an action with its key, its names from the permission, and its fields', () => {
    const action = byId('TicketSetupController.createType');
    expect(action).toMatchObject({ kind: 'write', httpMethod: 'POST', path: '/tickets/setup/desks/:deskId/types', permission: CorePermission.TicketsTypeCreate });
    expect(action?.labelAr).not.toBe(CorePermission.TicketsTypeCreate);
    expect(action?.labelEn).not.toBe(CorePermission.TicketsTypeCreate);
    const deskId = action?.fields.find((f) => f.place === 'path' && f.name === 'deskId');
    expect(deskId?.required).toBe(true);
    expect(action?.fields.some((f) => f.place === 'body' && f.required)).toBe(true);
  });

  it('FR-135: a route can carry a hint for the model (@AgentHint) and it is part of the action', () => {
    expect(byId('TicketSetupController.createType')?.hint).toContain('deskId');
    expect(byId(DESKS_ID)?.hint).toBeNull();
  });

  it('FR-135: a GET with a key is a read action the assistant may look data up with', () => {
    expect(byId('TicketSetupController.desks')).toMatchObject({ kind: 'read', httpMethod: 'GET', permission: CorePermission.TicketsSetupView });
  });

  it('FR-136: uploads, sign-in and second-factor routes never reach the catalog, and each exclusion says why', () => {
    const ids = new Set(catalog().all().map((a) => a.operationId));
    expect(ids.has('FilesController.upload')).toBe(false);
    expect(ids.has('EmployeePhotoController.set')).toBe(false);
    const reasons = new Map(catalog().excluded().map((e) => [e.operationId, e.reason]));
    expect(reasons.get('FilesController.upload')).toBe('upload');
    expect(reasons.get('EmployeePhotoController.set')).toBe('upload');
    expect([...catalog().all()].every((a) => !a.path.startsWith('/mfa') && !a.path.startsWith('/impersonation'))).toBe(true);
  });

  it('FR-136: no action of the platform lacks a key, every one has a path and a unique id', () => {
    const all = catalog().all();
    expect(all.length).toBeGreaterThan(50);
    expect(all.every((a) => a.permission && a.path.startsWith('/'))).toBe(true);
    expect(new Set(all.map((a) => a.operationId)).size).toBe(all.length);
  });

  it('FR-137: a person sees only the actions of the keys they hold, and the one who holds the key sees the action', async () => {
    const holder = await contextOf([CorePermission.TicketsTypeCreate]);
    const mine = catalog().forContext(holder);
    expect(mine.map((a) => a.operationId)).toContain('TicketSetupController.createType');
    expect(mine.every((a) => holder.has(a.permission))).toBe(true);
    expect(mine.length).toBeLessThan(catalog().all().length);
  });

  it('FR-137: without the key the action is not in the catalog at all, so the model never sees it', async () => {
    const other = await contextOf([]);
    const mine = catalog().forContext(other);
    expect(mine.map((a) => a.operationId)).not.toContain('TicketSetupController.createType');
    expect(mine.every((a) => other.has(a.permission))).toBe(true);
  });
});
