import { LEVEL_HEAD_DEFAULT_PERMISSIONS } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { useTestApp } from './setup/test-app';

/**
 * A unit head holds the default head role (never platform admin mode): every page and list their keys open must answer, not 403 / ADMIN_MODE_REQUIRED.
 * The list is one route per page the head role gives a key for (FR-36, FR-48, FR-54).
 */
const PAGES = ['/api/employees', '/api/career/team', '/api/career/requests', '/api/performance/team', '/api/tasks/team', '/api/tasks/matrix', '/api/task-tags', '/api/task-tags/departments', '/api/tickets?tab=team', '/api/tickets?tab=mine', '/api/tickets?tab=inbox', '/api/tickets/setup/desks', '/api/tickets/figures'];

describe('What a unit head reaches with the default head role, without admin mode', () => {
  const t = useTestApp();

  it('opens every page of the head role (200), and keeps a desk out of its unit at 404', async () => {
    const org = await t.factories.org();
    const head = await t.factories.user({ unit: { ...org.unitA, id: org.department }, grants: LEVEL_HEAD_DEFAULT_PERMISSIONS.map((g) => ({ key: g.key, scope: g.scope })) });
    const agent = await t.factories.signIn(head);
    const answers: Record<string, number> = {};
    for (const path of PAGES) answers[path] = (await agent.get(path)).status;
    expect(answers).toEqual(Object.fromEntries(PAGES.map((p) => [p, 200])));
    await agent.get(`/api/tickets/setup/desks/${org.otherDepartment}`).expect(404);
  });
});
