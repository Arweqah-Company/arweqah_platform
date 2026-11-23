import { CorePermission, LEVEL_HEAD_DEFAULT_PERMISSIONS, riyadhToday, type NoticeChannelCode, type NoticeDetailsDto, type PermissionGrant } from '@arweqah-platform/shared';
import { DataSource } from 'typeorm';
import { UserAccessService } from '../../src/core/access/application/user-access.service';
import { NoticeChannelService } from '../../src/modules/notices/application/services/notice-channel.service';
import type { TestAgent, TestOrg, TestUser } from '../factories/factories';
import type { TestContext } from '../setup/test-app';

/** What the head role of a unit holds for notices (the same list the migration adds to the existing head roles): the unit and below. */
export const NOTICE_HEAD_GRANTS: PermissionGrant[] = LEVEL_HEAD_DEFAULT_PERMISSIONS.filter((p) => p.key.startsWith('notices.')).map((p) => ({ key: p.key, scope: p.scope }));

/** The keys to manage the channels of units and their writers, at a given reach (a platform administrator: `all`). */
export const writerManagerGrants = (scope: PermissionGrant['scope'] = 'all'): PermissionGrant[] =>
  [CorePermission.NoticesChannelsView, CorePermission.NoticesWriterAdd, CorePermission.NoticesWriterRemove, CorePermission.NoticesChannelAdd, CorePermission.NoticesChannelRemove].map((key) => ({ key, scope }));

/** The first two channels belong to units of the test organization (the seed ties them to the real structure; the test one has other names). */
export async function tieChannelsToUnits(t: TestContext, units: { hr: string; comms: string }): Promise<void> {
  await t.db.query(`UPDATE notice_channels SET org_node_id = $1 WHERE code = 'hr'`, [units.hr]);
  await t.db.query(`UPDATE notice_channels SET org_node_id = $1 WHERE code = 'corporate_comms'`, [units.comms]);
}

/** The start of a channels test world: both channels tied to units A (hr) and C (comms), a platform administrator (`all`) and the head of unit A (`subtree`). */
export async function channelsBase(t: TestContext) {
  await t.app.get(NoticeChannelService).ensureSetup();
  const org = await t.factories.org();
  await tieChannelsToUnits(t, { hr: org.unitA.id, comms: org.unitC.id });
  const admin = await t.factories.user({ grants: writerManagerGrants('all') });
  const head = await t.factories.user({ unit: org.unitA, grants: NOTICE_HEAD_GRANTS });
  return { org, admin, head };
}

export const dayFromToday = (days: number): string => riyadhToday(new Date(Date.now() + days * 86_400_000));

export const TODAY = (): string => riyadhToday();

export const NOTICE_BODY = '<p>نص <strong>التعميم</strong></p>';

export interface NoticeWorld {
  org: TestOrg;
  /** Writes in the HR channel, sits in unit A. */
  writer: TestUser;
  /** The head of unit A: approves what the writer sends. */
  head: TestUser;
  /** The head of unit C: another unit (out of reach of the writer's notices). */
  otherHead: TestUser;
  /** An ordinary employee of unit B. */
  employee: TestUser;
  agents: { writer: TestAgent; head: TestAgent; otherHead: TestAgent; employee: TestAgent };
}

/** The two channels with their writer roles, and a small organization: a writer, the head of the writer's unit, a head elsewhere and an employee. */
export async function noticeWorld(t: TestContext): Promise<NoticeWorld> {
  await t.app.get(NoticeChannelService).ensureSetup();
  const org = await t.factories.org();
  const head = await t.factories.user({ unit: org.unitA, grants: NOTICE_HEAD_GRANTS });
  const otherHead = await t.factories.user({ unit: org.unitC, grants: NOTICE_HEAD_GRANTS });
  const writer = await t.factories.user({ unit: org.unitA });
  const employee = await t.factories.user({ unit: org.unitB });
  await t.db.query('UPDATE org_nodes SET manager_id = $1 WHERE id = $2', [head.employeeId, org.unitA.id]);
  await t.db.query('UPDATE org_nodes SET manager_id = $1 WHERE id = $2', [otherHead.employeeId, org.unitC.id]);
  await tieChannelsToUnits(t, { hr: org.unitA.id, comms: org.unitC.id });
  await makeWriter(t, writer, 'hr');
  return {
    org,
    writer,
    head,
    otherHead,
    employee,
    agents: { writer: await t.factories.signIn(writer), head: await t.factories.signIn(head), otherHead: await t.factories.signIn(otherHead), employee: await t.factories.signIn(employee) },
  };
}

/** Makes the person a writer of the channel the way the page does: the membership row and the channel's role. */
export async function makeWriter(t: TestContext, user: TestUser, code: NoticeChannelCode): Promise<void> {
  const rows: { id: string; writer_role_id: string }[] = await t.db.query('SELECT id, writer_role_id FROM notice_channels WHERE code = $1', [code]);
  await t.db.query('INSERT INTO notice_channel_writers (channel_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [rows[0]?.id, user.id]);
  const roles = await t.db.query('SELECT role_id FROM user_roles WHERE user_id = $1', [user.id]);
  await t.app.get(UserAccessService).replaceRoles(user.id, [...(roles as { role_id: string }[]).map((r) => r.role_id), rows[0]?.writer_role_id as string]);
}

export const noticeBody = (overrides: Record<string, unknown> = {}) => ({
  channelCode: 'hr',
  kind: 'policy',
  publishOn: TODAY(),
  titleAr: 'سياسة السفر',
  titleEn: 'Travel policy',
  body: NOTICE_BODY,
  audience: [{ type: 'all' }],
  fileIds: [],
  ...overrides,
});

export const createNotice = async (agent: TestAgent, overrides: Record<string, unknown> = {}): Promise<NoticeDetailsDto> => (await agent.post('/api/notices').send(noticeBody(overrides)).expect(201)).body;

/** Writer creates and submits; the head of the writer's unit approves. Returns the details after the approval. */
export async function approvedNotice(w: NoticeWorld, overrides: Record<string, unknown> = {}): Promise<NoticeDetailsDto> {
  const created = await createNotice(w.agents.writer, overrides);
  await w.agents.writer.post(`/api/notices/${created.id}/submit`).send({}).expect(200);
  return (await w.agents.head.post(`/api/notices/${created.id}/approve`).send({}).expect(200)).body;
}

export const dbOf = (t: TestContext): DataSource => t.db;
