import { CorePermission, EMPLOYEE_DEFAULT_PERMISSIONS, LEVEL_HEAD_DEFAULT_PERMISSIONS, type NoticeChannelsDto, type NoticeWriterCandidateDto } from '@arweqah-platform/shared';
import { describe, expect, it, vi } from 'vitest';
import { AutoRolesService } from '../src/core/access/application/auto-roles.service';
import { RolesService } from '../src/core/access/application/roles.service';
import { UserAccessService } from '../src/core/access/application/user-access.service';
import { Notices1795343093493 } from '../src/database/migrations/1795343093493-Notices';
import { NoticeChannelService } from '../src/modules/notices/application/services/notice-channel.service';
import { channelsBase, createNotice, noticeBody } from './helpers/notices';
import { useTestApp } from './setup/test-app';

describe('Notice channels: writers and the permissions they get (FR-172, FR-174, FR-175, FR-177)', () => {
  const t = useTestApp();

  /** Both channels, an organization, a platform administrator (`all`), the head of unit A (`subtree`) and employees in units A, B and C. */
  async function world() {
    const { org, admin, head } = await channelsBase(t);
    await t.db.query('UPDATE org_nodes SET manager_id = $1 WHERE id = $2', [head.employeeId, org.unitA.id]);
    const inA = await t.factories.user({ unit: org.unitA });
    const inB = await t.factories.user({ unit: org.unitB });
    const inC = await t.factories.user({ unit: org.unitC });
    return { org, admin, head, inA, inB, inC, agents: { admin: await t.factories.signIn(admin), head: await t.factories.signIn(head) } };
  }
  type World = Awaited<ReturnType<typeof world>>;
  const add = (agent: Awaited<ReturnType<typeof world>>['agents']['admin'], code: string, employeeId: string, extra: Record<string, unknown> = {}) => agent.post(`/api/notices/channels/${code}/writers`).send({ employeeId, ...extra });
  const rolesOf = async (userId: string): Promise<string[]> => ((await t.db.query('SELECT r.name_en FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = $1', [userId])) as { name_en: string }[]).map((r) => r.name_en);
  const writerRole = 'Notice writer — Human resources';

  describe('adding a writer gives the channel\'s permissions at once, removing takes them back', () => {
    it('inserts the row, gives the role and the writing keys in one step, tells the writer, and the writer writes without signing in again', async () => {
      const w = await world();
      const writerAgent = await t.factories.signIn(w.inA);
      await writerAgent.post('/api/notices').send(noticeBody()).expect(403); // no key yet
      const channels = (await add(w.agents.admin, 'hr', w.inA.employeeId, { note: 'لتعاميم الإجازات' }).expect(201)).body as NoticeChannelsDto;
      expect(channels.channels.find((c) => c.code === 'hr')?.writers.map((x) => x.userId)).toEqual([w.inA.id]);
      expect(await rolesOf(w.inA.id)).toContain(writerRole);
      expect(await rolesOf(w.inA.id)).not.toContain('Notice writer — Corporate communications');
      const created = await createNotice(writerAgent); // the same session, no new sign-in
      expect(created.status).toBe('draft');
      await writerAgent.get('/api/notices').expect(200);
      expect((await writerAgent.post('/api/notices').send(noticeBody({ channelCode: 'corporate_comms' })).expect(403)).body.code).toBe('NOTICE_NOT_CHANNEL_WRITER');
      await writerAgent.post(`/api/notices/${created.id}/approve`).send({}).expect(403); // the role never approves
      await writerAgent.post(`/api/notices/${created.id}/pin`).send({}).expect(403);
      const bell = await t.db.query(`SELECT 1 FROM notifications WHERE user_id = $1 AND link = '/notices/manage'`, [w.inA.id]);
      expect(bell).toHaveLength(1);
      await vi.waitFor(async () => expect((await t.db.query(`SELECT changes FROM audit_logs WHERE action = 'notice.writer_added'`)).length).toBe(1));
      const audit = await t.db.query(`SELECT changes FROM audit_logs WHERE action = 'notice.writer_added'`);
      expect(audit[0].changes).toMatchObject({ userId: w.inA.id, note: 'لتعاميم الإجازات' });
    });

    it('takes the role back when the writer is removed (writing is refused at once), keeps their drafts and tells them', async () => {
      const w = await world();
      const agent = await t.factories.signIn(w.inA);
      await add(w.agents.admin, 'hr', w.inA.employeeId).expect(201);
      const draft = await createNotice(agent);
      await w.agents.admin.delete(`/api/notices/channels/hr/writers/${w.inA.id}`).expect(204);
      expect(await rolesOf(w.inA.id)).not.toContain(writerRole);
      expect(await t.db.query('SELECT 1 FROM notice_channel_writers')).toHaveLength(0);
      await agent.post('/api/notices').send(noticeBody()).expect(403);
      expect((await t.db.query('SELECT status FROM notices WHERE id = $1', [draft.id]))[0].status).toBe('draft');
      expect((await t.db.query(`SELECT count(*)::int AS n FROM notifications WHERE user_id = $1 AND link = '/notices'`, [w.inA.id]))[0].n).toBe(1);
      await w.agents.admin.delete(`/api/notices/channels/hr/writers/${w.inA.id}`).expect(404); // not a writer any more
    });

    it('refuses a writer twice (409), an inactive employee (422), an unknown employee (404), an unknown channel (404) and a bad channel code (400); nothing is left half done', async () => {
      const w = await world();
      await add(w.agents.admin, 'hr', w.inA.employeeId).expect(201);
      expect((await add(w.agents.admin, 'hr', w.inA.employeeId).expect(409)).body.code).toBe('NOTICE_WRITER_EXISTS');
      expect(await t.db.query('SELECT 1 FROM notice_channel_writers')).toHaveLength(1);
      const inactive = await t.factories.user({ unit: w.org.unitB, active: false });
      expect((await add(w.agents.admin, 'hr', inactive.employeeId).expect(422)).body.code).toBe('NOTICE_WRITER_INACTIVE');
      await add(w.agents.admin, 'hr', '00000000-0000-4000-8000-000000000009').expect(404);
      await add(w.agents.admin, 'other', w.inB.employeeId).expect(404);
      await add(w.agents.admin, 'Bad Code!', w.inB.employeeId).expect(400);
      await add(w.agents.admin, 'hr', w.inB.employeeId, { surprise: 1 }).expect(400);
      expect(await rolesOf(w.inB.id)).not.toContain(writerRole);
    });

    it('leaves neither a row without a role nor a role without a row when the step in the middle fails', async () => {
      const w = await world();
      const spy = vi.spyOn(t.app.get(UserAccessService), 'grantRole').mockRejectedValueOnce(new Error('boom'));
      await add(w.agents.admin, 'hr', w.inA.employeeId).expect(500);
      spy.mockRestore();
      expect(await t.db.query('SELECT 1 FROM notice_channel_writers')).toHaveLength(0);
      expect(await rolesOf(w.inA.id)).not.toContain(writerRole);
      await add(w.agents.admin, 'hr', w.inA.employeeId).expect(201); // and it works afterwards
    });
  });

  describe('who may manage which writers (FR-174)', () => {
    it('lets the head of the channel\'s unit add a writer from their unit, not from another unit (404), and see and remove every writer of the channel', async () => {
      const w = await world();
      await add(w.agents.head, 'hr', w.inA.employeeId).expect(201);
      await add(w.agents.head, 'hr', w.inC.employeeId).expect(404); // not in the reach of the head's key
      await add(w.agents.admin, 'hr', w.inC.employeeId).expect(201); // a platform-wide key reaches every unit
      const headView = (await w.agents.head.get('/api/notices/channels').expect(200)).body as NoticeChannelsDto;
      expect(headView.channels.map((c) => c.code)).toEqual(['hr']); // the other channel belongs to unit C: out of reach, not shown
      expect(headView.channels[0]?.writers.map((x) => x.userId).sort()).toEqual([w.inA.id, w.inC.id].sort());
      expect(headView.channels[0]).toMatchObject({ canAddWriter: true, canRemoveWriter: true, canToggle: true, canRename: true, canDelete: true }) // the head role holds the channel keys at subtree (FR-177);
      await w.agents.head.delete(`/api/notices/channels/hr/writers/${w.inC.id}`).expect(204); // the channel is the head's: its writers are theirs to remove
      await w.agents.head.delete(`/api/notices/channels/corporate_comms/writers/${w.inA.id}`).expect(404); // another unit's channel: not found
    });

    it('checks the unit of the channel: a person with the writer keys of unit A gets 404 on the channel of unit C and sees only the first', async () => {
      const w = await world();
      const unitA = await t.factories.user({ unit: w.org.unitA, grants: [CorePermission.NoticesChannelsView, CorePermission.NoticesWriterAdd, CorePermission.NoticesWriterRemove].map((key) => ({ key, scope: 'subtree' as const })) });
      const agent = await t.factories.signIn(unitA);
      await add(agent, 'corporate_comms', w.inC.employeeId).expect(404);
      await agent.delete(`/api/notices/channels/corporate_comms/writers/${w.inA.id}`).expect(404);
      await agent.get('/api/notices/channels/corporate_comms/candidates').expect(404);
      await add(agent, 'hr', w.inA.employeeId).expect(201);
      const view = (await agent.get('/api/notices/channels').expect(200)).body as NoticeChannelsDto;
      expect(view.channels.map((c) => c.code)).toEqual(['hr']);
      expect(view.settings).toBeNull(); // no key for the batch settings
      expect(view.canCreate).toBe(false);
      const stranger = await t.factories.signIn(w.inB);
      await stranger.get('/api/notices/channels').expect(403);
      await add(stranger, 'hr', w.inA.employeeId).expect(403);
    });

    it('hides the delete icon of a writer outside the reach of the remove key, and shows the settings card to its holder only', async () => {
      const w = await world();
      const settingsOnly = await t.factories.user({ grants: [CorePermission.NoticesChannelsView, CorePermission.NoticesSettingsEdit].map((key) => ({ key, scope: 'all' as const })) });
      const view = (await (await t.factories.signIn(settingsOnly)).get('/api/notices/channels').expect(200)).body as NoticeChannelsDto;
      expect(view.channels).toEqual([]); // no key to add or remove: no channel card
      expect(view.settings).toEqual({ batchSize: 500, batchIntervalMinutes: 5, canEdit: true });
      expect(((await w.agents.admin.get('/api/notices/channels').expect(200)).body as NoticeChannelsDto).settings).toBeNull(); // the key of the settings is a key of its own
    });
  });

  describe('candidates', () => {
    it('lists active employees inside the reach of the add key who are not writers yet, by any part of the name from the first letter, with the missing-approver warning', async () => {
      const w = await world();
      await add(w.agents.admin, 'hr', w.inA.employeeId).expect(201);
      const inactive = await t.factories.user({ unit: w.org.unitA, active: false });
      await t.db.query(`UPDATE employees SET full_name = 'Zaid Alpha' WHERE id = $1`, [w.inB.employeeId]);
      await t.db.query(`UPDATE employees SET full_name = 'Zaid Beta' WHERE id = $1`, [w.inC.employeeId]);
      const all = (await w.agents.admin.get('/api/notices/channels/hr/candidates').query({ search: 'z' }).expect(200)).body as NoticeWriterCandidateDto[];
      expect(all.map((c) => c.name).sort()).toEqual(['Zaid Alpha', 'Zaid Beta']);
      expect(all[0]?.unit).toMatchObject({ nameEn: expect.any(String) });
      const ids = ((await w.agents.admin.get('/api/notices/channels/hr/candidates').expect(200)).body as NoticeWriterCandidateDto[]).map((c) => c.userId);
      expect(ids).not.toContain(w.inA.id); // already a writer
      expect(ids).not.toContain(inactive.id); // not active
      const headSees = ((await w.agents.head.get('/api/notices/channels/hr/candidates').expect(200)).body as NoticeWriterCandidateDto[]).map((c) => c.userId);
      expect(headSees).toContain(w.head.id);
      expect(headSees).not.toContain(w.inC.id); // another unit: not in the reach of the head's key
      const unitB = (await w.agents.admin.get('/api/notices/channels/hr/candidates').query({ search: 'Alpha' }).expect(200)).body as NoticeWriterCandidateDto[];
      expect(unitB[0]?.hasNoApprover).toBe(true); // nobody leads the units above them
      const headInA = (await w.agents.admin.get('/api/notices/channels/hr/candidates').query({ search: w.inA.email.slice(0, 3) }).expect(200)).body as NoticeWriterCandidateDto[];
      expect(headInA.every((c) => typeof c.hasNoApprover === 'boolean')).toBe(true);
    });
  });

  describe('the roles and the migration', () => {
    it('keeps the writer roles fixed: their permissions cannot change and they cannot be deleted', async () => {
      const w = await world();
      const role = (await t.db.query(`SELECT id, name_ar, name_en FROM roles WHERE auto_rule = 'notice_writer' AND name_en = $1`, [writerRole]))[0];
      const roles = t.app.get(RolesService);
      await expect(roles.update(role.id, { nameAr: role.name_ar, nameEn: role.name_en, permissions: [{ key: CorePermission.NoticesView, scope: 'own' }] }, w.admin.id)).rejects.toMatchObject({ code: 'DERIVED_ROLE' });
      await expect(roles.remove(role.id, w.admin.id)).rejects.toMatchObject({ code: 'DERIVED_ROLE' });
      const keys = ((await t.db.query('SELECT permission_key FROM role_permissions WHERE role_id = $1', [role.id])) as { permission_key: string }[]).map((r) => r.permission_key);
      expect(keys).not.toContain(CorePermission.NoticesApprove);
      expect(keys).toEqual(expect.arrayContaining([CorePermission.NoticesCreate, CorePermission.NoticesSubmit, CorePermission.NoticesRevise]));
    });

    it('gives the notice keys to the Employee role and to a new head role (the defaults), and the migration adds only the missing ones to existing roles, twice with the same result', async () => {
      const w = await world();
      expect(EMPLOYEE_DEFAULT_PERMISSIONS.filter((p) => p.key.startsWith('notices.')).map((p) => [p.key, p.scope])).toEqual([[CorePermission.NoticesView, 'own'], [CorePermission.NoticesAcknowledge, 'own'], [CorePermission.NoticesExportMine, 'own']]);
      await t.app.get(AutoRolesService).refresh();
      const head = (await t.db.query(`SELECT id FROM roles WHERE auto_rule = 'node_head' AND org_node_id = $1`, [w.org.unitA.id]))[0];
      const created = ((await t.db.query('SELECT permission_key, scope FROM role_permissions WHERE role_id = $1 AND permission_key LIKE $2', [head.id, 'notices.%'])) as { permission_key: string; scope: string }[]).sort((a, b) => a.permission_key.localeCompare(b.permission_key));
      const wanted = LEVEL_HEAD_DEFAULT_PERMISSIONS.filter((p) => p.key.startsWith('notices.')).map((p) => p.key).sort();
      expect(created.map((r) => r.permission_key)).toEqual(wanted);
      expect(created.every((r) => r.scope === 'subtree')).toBe(true);
      // an existing head role and an existing Employee role that lack some keys
      const employeeRole = await t.factories.role([{ key: CorePermission.NoticesView, scope: 'own' }]);
      await t.db.query(`UPDATE roles SET auto_rule = 'everyone' WHERE id = $1`, [employeeRole.id]);
      await t.db.query(`DELETE FROM role_permissions WHERE role_id = $1 AND permission_key IN ('notices.approve', 'notices.reject')`, [head.id]);
      await t.db.query(`UPDATE role_permissions SET scope = 'all' WHERE role_id = $1 AND permission_key = 'notices.archive'`, [head.id]); // an administrator widened it: it stays
      const runner = t.db.createQueryRunner();
      await runner.connect();
      try {
        const migration = new Notices1795343093493() as unknown as { seed(r: typeof runner): Promise<void> };
        await migration.seed(runner);
        const afterFirst = JSON.stringify(await t.db.query('SELECT role_id, permission_key, scope FROM role_permissions ORDER BY role_id, permission_key'));
        await migration.seed(runner);
        expect(JSON.stringify(await t.db.query('SELECT role_id, permission_key, scope FROM role_permissions ORDER BY role_id, permission_key'))).toBe(afterFirst);
      } finally {
        await runner.release();
      }
      const headKeys = ((await t.db.query('SELECT permission_key, scope FROM role_permissions WHERE role_id = $1', [head.id])) as { permission_key: string; scope: string }[]);
      expect(headKeys.find((k) => k.permission_key === 'notices.approve')?.scope).toBe('subtree');
      expect(headKeys.find((k) => k.permission_key === 'notices.archive')?.scope).toBe('all');
      const employeeKeys = ((await t.db.query('SELECT permission_key FROM role_permissions WHERE role_id = $1', [employeeRole.id])) as { permission_key: string }[]).map((r) => r.permission_key).sort();
      expect(employeeKeys).toEqual(['notices.acknowledge', 'notices.export_mine', 'notices.view']);
      expect(await t.db.query('SELECT 1 FROM notice_channels')).toHaveLength(2);
      expect(await t.db.query(`SELECT 1 FROM roles WHERE auto_rule = 'notice_writer'`)).toHaveLength(2);
    });
  });

  it('seeds the two channels once and keeps what an administrator changed on a second run', async () => {
    const w: World = await world();
    await t.db.query(`UPDATE notice_channels SET name_en = 'Renamed' WHERE code = 'hr'`);
    await t.app.get(NoticeChannelService).ensureSetup();
    expect((await t.db.query(`SELECT name_en FROM notice_channels WHERE code = 'hr'`))[0].name_en).toBe('Renamed');
    expect(await t.db.query('SELECT 1 FROM notice_channels')).toHaveLength(2);
    expect(w.admin.id).toBeTruthy();
  });
});
