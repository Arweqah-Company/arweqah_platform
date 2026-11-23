import { CorePermission, type NoticeChannelDto, type NoticeFilterOptionsDto, type NoticeUnitRefDto } from '@arweqah-platform/shared';
import { describe, expect, it, vi } from 'vitest';
import { NoticeChannelsPerUnit1795400000000 } from '../src/database/migrations/1795400000000-NoticeChannelsPerUnit';
import { NoticeChannelService } from '../src/modules/notices/application/services/notice-channel.service';
import type { TestAgent } from './factories/factories';
import { useTestApp } from './setup/test-app';
import { channelsBase, createNotice, noticeBody } from './helpers/notices';

/** A channel for any unit (FR-177): made with its writer role, writers get the role by adding and lose it by removal, disabling, deleting, and who may do each. */
describe('Notice channels of units (FR-177)', () => {
  const t = useTestApp();

  async function world() {
    const { org, admin, head } = await channelsBase(t);
    const inA = await t.factories.user({ unit: org.unitA });
    const inB = await t.factories.user({ unit: org.unitB });
    return { org, admin, head, inA, inB, agents: { admin: await t.factories.signIn(admin), head: await t.factories.signIn(head), inA: await t.factories.signIn(inA), inB: await t.factories.signIn(inB) } };
  }
  const NAMES = { nameAr: 'الشؤون القانونية', nameEn: 'Legal affairs' };
  const create = (agent: TestAgent, unitId: string, extra: Record<string, unknown> = {}) => agent.post('/api/notices/channels').send({ ...NAMES, unitId, ...extra });
  const made = async (agent: TestAgent, unitId: string, extra: Record<string, unknown> = {}) => (await create(agent, unitId, extra).expect(201)).body as NoticeChannelDto;
  const rolesOf = async (userId: string): Promise<string[]> => ((await t.db.query('SELECT r.name_en FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = $1', [userId])) as { name_en: string }[]).map((r) => r.name_en);
  const addWriter = (agent: TestAgent, code: string, employeeId: string) => agent.post(`/api/notices/channels/${code}/writers`).send({ employeeId });
  const roleName = 'Notice writer — Legal affairs';

  describe('making a channel', () => {
    it('makes the channel for the unit, with its code, its writer role (fixed keys, named from the channel) and an audit entry', async () => {
      const w = await world();
      const channel = await made(w.agents.admin, w.org.unitB.id);
      expect(channel).toMatchObject({ code: 'legal_affairs', nameAr: NAMES.nameAr, nameEn: NAMES.nameEn, isActive: true, writersCount: 0, noticesCount: 0, writers: [], canAddWriter: true, canRemoveWriter: true, canRename: true, canToggle: true, canDelete: true });
      expect(channel.unit).toMatchObject({ id: w.org.unitB.id });
      const role = (await t.db.query(`SELECT id, name_ar, is_system, auto_rule FROM roles WHERE id = $1`, [channel.writerRoleId]))[0];
      expect(role).toMatchObject({ name_ar: 'كاتب تعاميم — الشؤون القانونية', is_system: true, auto_rule: 'notice_writer' });
      const keys = ((await t.db.query('SELECT permission_key, scope FROM role_permissions WHERE role_id = $1', [role.id])) as { permission_key: string; scope: string }[]);
      expect(keys.every((k) => k.scope === 'own')).toBe(true);
      expect(keys.map((k) => k.permission_key)).toEqual(expect.arrayContaining([CorePermission.NoticesCreate, CorePermission.NoticesSubmit]));
      expect(keys.map((k) => k.permission_key)).not.toContain(CorePermission.NoticesApprove);
      const list = (await w.agents.admin.get('/api/notices/channels').expect(200)).body as { channels: NoticeChannelDto[]; canCreate: boolean };
      expect(list.channels.map((c) => c.code)).toEqual(['corporate_comms', 'hr', 'legal_affairs']);
      expect(list.canCreate).toBe(true);
      await vi.waitFor(async () => expect((await t.db.query(`SELECT 1 FROM audit_logs WHERE action = 'notice.channel_created'`)).length).toBe(1));
    });

    it('numbers the code when two names make the same slug', async () => {
      const w = await world();
      await made(w.agents.admin, w.org.unitB.id);
      const second = await made(w.agents.admin, w.org.unitB.id, { nameAr: 'الشؤون القانونية 2', nameEn: 'Legal  Affairs!' });
      expect(second.code).toBe('legal_affairs_2');
    });

    it('refuses bad input with 400 (name, unit, extra fields)', async () => {
      const w = await world();
      for (const body of [{ nameAr: '' }, { nameEn: ' ' }, { nameAr: 'x'.repeat(91) }, { unitId: 'not-a-uuid' }, { surprise: 1 }]) {
        await create(w.agents.admin, w.org.unitB.id, body).expect(400);
      }
      await w.agents.admin.post('/api/notices/channels').send({ ...NAMES }).expect(400); // no unit
      expect(await t.db.query(`SELECT 1 FROM notice_channels WHERE code = 'legal_affairs'`)).toHaveLength(0);
    });

    it('refuses a name another channel has, in either language and whatever the case (409)', async () => {
      const w = await world();
      await made(w.agents.admin, w.org.unitB.id);
      expect((await create(w.agents.admin, w.org.unitB.id, { nameAr: 'اسم آخر' }).expect(409)).body.code).toBe('NOTICE_CHANNEL_NAME_EXISTS');
      expect((await create(w.agents.admin, w.org.unitB.id, { nameEn: 'LEGAL AFFAIRS ', nameAr: 'اسم ثالث' }).expect(409)).body.code).toBe('NOTICE_CHANNEL_NAME_EXISTS');
      expect(await t.db.query(`SELECT 1 FROM roles WHERE auto_rule = 'notice_writer'`)).toHaveLength(3); // the two first channels and this one: nothing left behind
    });

    it('refuses an unknown unit with 404', async () => {
      const w = await world();
      await create(w.agents.admin, '00000000-0000-4000-8000-000000000009').expect(404);
    });

    it('answers 403 to a person without the key, whatever the route', async () => {
      const w = await world();
      const channel = await made(w.agents.admin, w.org.unitA.id);
      await create(w.agents.inA, w.org.unitA.id).expect(403);
      await w.agents.inA.get('/api/notices/channels/units').expect(403);
      await w.agents.inA.put(`/api/notices/channels/${channel.code}`).send(NAMES).expect(403);
      await w.agents.inA.post(`/api/notices/channels/${channel.code}/disable`).send({}).expect(403);
      await w.agents.inA.post(`/api/notices/channels/${channel.code}/enable`).send({}).expect(403);
      await w.agents.inA.delete(`/api/notices/channels/${channel.code}`).expect(403);
    });

    it('lets the head of a unit make a channel for their unit only: another unit is not found (404)', async () => {
      const w = await world();
      await create(w.agents.head, w.org.unitC.id).expect(404);
      await create(w.agents.head, w.org.unitB.id).expect(404); // a sibling, not below
      const own = await made(w.agents.head, w.org.unitA.id);
      expect(own.unit?.id).toBe(w.org.unitA.id);
      const hidden = await made(w.agents.admin, w.org.unitC.id, { nameAr: 'قناة أخرى', nameEn: 'Other channel' });
      await w.agents.head.put(`/api/notices/channels/${hidden.code}`).send(NAMES).expect(404);
      await w.agents.head.post(`/api/notices/channels/${hidden.code}/disable`).send({}).expect(404);
      await w.agents.head.delete(`/api/notices/channels/${hidden.code}`).expect(404);
    });

    it('offers the units of the reach of the key (the head: their own; the administrator: every unit), narrowed by name', async () => {
      const w = await world();
      const head = (await w.agents.head.get('/api/notices/channels/units').expect(200)).body as NoticeUnitRefDto[];
      expect(head.map((u) => u.id)).toEqual([w.org.unitA.id]);
      const all = (await w.agents.admin.get('/api/notices/channels/units').expect(200)).body as NoticeUnitRefDto[];
      expect(all.map((u) => u.id)).toEqual(expect.arrayContaining([w.org.unitA.id, w.org.unitB.id, w.org.unitC.id]));
      const found = (await w.agents.admin.get('/api/notices/channels/units').query({ search: 'Unit B' }).expect(200)).body as NoticeUnitRefDto[];
      expect(found.map((u) => u.id)).toEqual([w.org.unitB.id]);
    });
  });

  describe('writers of a new channel get its role at once and lose it on removal', () => {
    it('gives the role of that channel only, lets the writer write in it, and takes the role back (same transaction as the row)', async () => {
      const w = await world();
      const channel = await made(w.agents.head, w.org.unitA.id);
      await addWriter(w.agents.head, channel.code, w.inA.employeeId).expect(201);
      expect(await rolesOf(w.inA.id)).toEqual(expect.arrayContaining([roleName]));
      expect(await rolesOf(w.inA.id)).not.toContain('Notice writer — Human resources');
      const created = await createNotice(w.agents.inA, { channelCode: channel.code });
      expect(created.channel.code).toBe(channel.code);
      expect((await w.agents.inA.post('/api/notices').send(noticeBody({ channelCode: 'hr' })).expect(403)).body.code).toBe('NOTICE_NOT_CHANNEL_WRITER');
      const view = (await w.agents.head.get('/api/notices/channels').expect(200)).body as { channels: NoticeChannelDto[] };
      expect(view.channels.find((c) => c.code === channel.code)).toMatchObject({ writersCount: 1, noticesCount: 1, canDelete: false });
      await w.agents.head.delete(`/api/notices/channels/${channel.code}/writers/${w.inA.id}`).expect(204);
      expect(await rolesOf(w.inA.id)).not.toContain(roleName);
      await w.agents.inA.post('/api/notices').send(noticeBody({ channelCode: channel.code })).expect(403);
    });

    it('does not let a unit head add a writer to a channel of another unit', async () => {
      const w = await world();
      const channel = await made(w.agents.admin, w.org.unitC.id, { nameAr: 'قناة أخرى', nameEn: 'Other channel' });
      await addWriter(w.agents.head, channel.code, w.inA.employeeId).expect(404);
      expect(await t.db.query('SELECT 1 FROM notice_channel_writers')).toHaveLength(0);
    });
  });

  describe('disabling, enabling and deleting', () => {
    async function withWriter() {
      const w = await world();
      const channel = await made(w.agents.admin, w.org.unitA.id);
      await addWriter(w.agents.admin, channel.code, w.inA.employeeId).expect(201);
      return { w, channel };
    }

    it('takes the role from every writer, keeps the membership, blocks writing and hides the channel from the choices; enabling gives the role back', async () => {
      const { w, channel } = await withWriter();
      const draft = await createNotice(w.agents.inA, { channelCode: channel.code });
      const off = (await w.agents.admin.post(`/api/notices/channels/${channel.code}/disable`).send({}).expect(200)).body as NoticeChannelDto;
      expect(off).toMatchObject({ isActive: false, writersCount: 1, canAddWriter: false });
      expect(await rolesOf(w.inA.id)).not.toContain(roleName);
      expect(await t.db.query('SELECT 1 FROM notice_channel_writers')).toHaveLength(1);
      await w.agents.inA.post('/api/notices').send(noticeBody({ channelCode: channel.code })).expect(403); // the key went with the role
      expect((await t.db.query('SELECT status FROM notices WHERE id = $1', [draft.id]))[0].status).toBe('draft'); // the history stays
      // somebody who still holds the writing keys by another way is refused by the channel itself
      const keeper = await t.factories.user({ unit: w.org.unitB, grants: [CorePermission.NoticesCreate, CorePermission.NoticesManageView].map((key) => ({ key, scope: 'own' as const })) });
      await t.db.query('INSERT INTO notice_channel_writers (channel_id, user_id) VALUES ($1, $2)', [channel.id, keeper.id]);
      const keeperAgent = await t.factories.signIn(keeper);
      expect((await keeperAgent.post('/api/notices').send(noticeBody({ channelCode: channel.code })).expect(409)).body.code).toBe('NOTICE_CHANNEL_DISABLED');
      expect((await addWriter(w.agents.admin, channel.code, w.inB.employeeId).expect(409)).body.code).toBe('NOTICE_CHANNEL_DISABLED');
      await w.agents.admin.get(`/api/notices/channels/${channel.code}/candidates`).expect(409);
      const options = (await keeperAgent.get('/api/notices/options').expect(200)).body as NoticeFilterOptionsDto;
      expect(options.channels.find((c) => c.code === channel.code)).toMatchObject({ isActive: false }); // still a choice of the filters
      expect(options.writableChannelCodes).not.toContain(channel.code);
      await w.agents.admin.post(`/api/notices/channels/${channel.code}/disable`).send({}).expect(200); // twice: nothing changes
      const on = (await w.agents.admin.post(`/api/notices/channels/${channel.code}/enable`).send({}).expect(200)).body as NoticeChannelDto;
      expect(on.isActive).toBe(true);
      expect(await rolesOf(w.inA.id)).toContain(roleName);
      expect(await rolesOf(keeper.id)).toContain(roleName);
      await createNotice(w.agents.inA, { channelCode: channel.code });
    });

    it('deletes only a channel that never had a notice (409 otherwise), with its role, and the writers lose it', async () => {
      const { w, channel } = await withWriter();
      await createNotice(w.agents.inA, { channelCode: channel.code });
      expect((await w.agents.admin.delete(`/api/notices/channels/${channel.code}`).expect(409)).body.code).toBe('NOTICE_CHANNEL_HAS_NOTICES');
      await w.agents.admin.post(`/api/notices/channels/${channel.code}/disable`).send({}).expect(200);
      expect((await w.agents.admin.delete(`/api/notices/channels/${channel.code}`).expect(409)).body.code).toBe('NOTICE_CHANNEL_HAS_NOTICES'); // disabling does not make it deletable
      const empty = await made(w.agents.admin, w.org.unitA.id, { nameAr: 'قناة فارغة', nameEn: 'Empty channel' });
      await addWriter(w.agents.admin, empty.code, w.inB.employeeId).expect(201);
      expect(await rolesOf(w.inB.id)).toContain('Notice writer — Empty channel');
      await w.agents.admin.delete(`/api/notices/channels/${empty.code}`).expect(204);
      expect(await rolesOf(w.inB.id)).not.toContain('Notice writer — Empty channel');
      expect(await t.db.query('SELECT 1 FROM roles WHERE id = $1', [empty.writerRoleId])).toHaveLength(0);
      expect(await t.db.query('SELECT 1 FROM notice_channel_writers WHERE channel_id = $1', [empty.id])).toHaveLength(0);
      await w.agents.admin.delete(`/api/notices/channels/${empty.code}`).expect(404);
    });

    it('renames the channel and its role, and keeps the code', async () => {
      const { w, channel } = await withWriter();
      const renamed = (await w.agents.admin.put(`/api/notices/channels/${channel.code}`).send({ nameAr: 'الإدارة القانونية', nameEn: 'Legal department' }).expect(200)).body as NoticeChannelDto;
      expect(renamed).toMatchObject({ code: 'legal_affairs', nameEn: 'Legal department', unit: { id: w.org.unitA.id } });
      expect((await t.db.query('SELECT name_en, name_ar FROM roles WHERE id = $1', [channel.writerRoleId]))[0]).toMatchObject({ name_en: 'Notice writer — Legal department', name_ar: 'كاتب تعاميم — الإدارة القانونية' });
      await w.agents.admin.put(`/api/notices/channels/${channel.code}`).send({ nameAr: 'الإدارة القانونية', nameEn: 'Legal department' }).expect(200); // its own name is not «taken»
      await w.agents.admin.put(`/api/notices/channels/${channel.code}`).send({ nameAr: 'قناة الموارد البشرية', nameEn: 'Whatever' }).expect(409);
      await w.agents.admin.put(`/api/notices/channels/${channel.code}`).send({ nameAr: 'اسم', nameEn: 'Name', unitId: w.org.unitB.id }).expect(400); // the unit never changes
    });
  });

  describe('the channel filter of «My notices»', () => {
    it('lists for an employee only the channels that have a notice delivered to them, and nothing before any', async () => {
      const w = await world();
      const channel = await made(w.agents.admin, w.org.unitA.id);
      await addWriter(w.agents.admin, channel.code, w.inA.employeeId).expect(201);
      const notice = await createNotice(w.agents.inA, { channelCode: channel.code });
      const reader = await t.factories.user({ unit: w.org.unitB, grants: [{ key: CorePermission.NoticesView, scope: 'own' }] });
      const agent = await t.factories.signIn(reader);
      expect((await agent.get('/api/notices/mine/channels').expect(200)).body).toEqual([]);
      await t.db.query(`UPDATE notices SET status = 'published', published_at = now(), current_version = 1 WHERE id = $1`, [notice.id]);
      await t.db.query('INSERT INTO notice_recipients (notice_id, user_id) VALUES ($1, $2)', [notice.id, reader.id]);
      expect((await agent.get('/api/notices/mine/channels').expect(200)).body).toEqual([{ code: channel.code, nameAr: NAMES.nameAr, nameEn: NAMES.nameEn, isActive: true }]);
      await (await t.factories.signIn(await t.factories.user({ bare: true }))).get('/api/notices/mine/channels').expect(403); // no notices.view
    });
  });

  describe('a channel of no unit', () => {
    it('is managed by the platform-wide key only: a unit head neither sees nor changes it', async () => {
      const w = await world();
      await t.db.query(`UPDATE notice_channels SET org_node_id = NULL WHERE code = 'hr'`);
      const head = (await w.agents.head.get('/api/notices/channels').expect(200)).body as { channels: NoticeChannelDto[] };
      expect(head.channels.map((c) => c.code)).not.toContain('hr');
      await addWriter(w.agents.head, 'hr', w.inA.employeeId).expect(404);
      const admin = (await w.agents.admin.get('/api/notices/channels').expect(200)).body as { channels: NoticeChannelDto[] };
      expect(admin.channels.find((c) => c.code === 'hr')).toMatchObject({ unit: null, canAddWriter: true });
    });
  });

  describe('the migration of existing data', () => {
    const migration = () => new NoticeChannelsPerUnit1795400000000() as unknown as { tieToUnits(r: unknown): Promise<void>; mergeWriterKeys(r: unknown): Promise<void> };
    const run = async (step: 'tieToUnits' | 'mergeWriterKeys') => {
      const runner = t.db.createQueryRunner();
      await runner.connect();
      try {
        await migration()[step](runner);
      } finally {
        await runner.release();
      }
    };

    it('ties the first two channels to their units by name, once, and leaves the others company-wide', async () => {
      await t.app.get(NoticeChannelService).ensureSetup();
      const org = await t.factories.org();
      await t.db.query(`UPDATE org_node_translations SET name = 'Corporate Communications Department' WHERE org_node_id = $1 AND lang = 'en'`, [org.department]);
      await run('tieToUnits');
      await run('tieToUnits');
      const rows = (await t.db.query('SELECT code, org_node_id FROM notice_channels ORDER BY code')) as { code: string; org_node_id: string | null }[];
      expect(rows).toEqual([{ code: 'corporate_comms', org_node_id: org.department }, { code: 'hr', org_node_id: null }]);
    });

    it('turns every grant of the four old keys into the two new ones, with the widest scope, in roles, groups and personal exceptions', async () => {
      const w = await world();
      const role = await t.factories.role([{ key: 'notices.hr_writer_add', scope: 'subtree' }, { key: 'notices.comms_writer_add', scope: 'all' }, { key: 'notices.hr_writer_remove', scope: 'company' }]);
      const user = await t.factories.user({ unit: w.org.unitB });
      await t.db.query(`INSERT INTO user_permissions (user_id, permission_key, scope, expires_at) VALUES ($1, 'notices.comms_writer_remove', 'company', '2099-01-01'), ($1, 'notices.hr_writer_remove', 'subtree', NULL)`, [user.id]);
      await run('mergeWriterKeys');
      await run('mergeWriterKeys');
      const grants = ((await t.db.query('SELECT permission_key, scope FROM role_permissions WHERE role_id = $1 ORDER BY permission_key', [role.id])) as { permission_key: string; scope: string }[]);
      expect(grants).toEqual([{ permission_key: 'notices.writer_add', scope: 'all' }, { permission_key: 'notices.writer_remove', scope: 'company' }]);
      const personal = (await t.db.query(`SELECT permission_key, scope, expires_at FROM user_permissions WHERE user_id = $1 AND permission_key LIKE 'notices.%'`, [user.id])) as { permission_key: string; scope: string; expires_at: unknown }[];
      expect(personal).toEqual([expect.objectContaining({ permission_key: 'notices.writer_remove', scope: 'company' })]);
      expect(await t.db.query(`SELECT 1 FROM role_permissions WHERE permission_key IN ('notices.hr_writer_add', 'notices.hr_writer_remove', 'notices.comms_writer_add', 'notices.comms_writer_remove')`)).toHaveLength(0);
    });
  });
});
