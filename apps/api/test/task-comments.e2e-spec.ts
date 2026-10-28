import { CorePermission as P, COMMENT_ACTIONS, COMMENT_RELATIONS, defaultCommentMatrix, type CommentRulesDto, type TaskConversationDto, type TaskDto } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import type { TestAgent } from './factories/factories';
import { ADMIN_MODE_GRANT } from './factories/factories';
import { TASK_COMMENT_GRANTS, TASK_COMMENTER_GRANTS, taskManagerGrants } from './factories/task-grants';
import { OutboxRelay } from '../src/core/messaging/infrastructure/typeorm-outbox';
import { useTestApp } from './setup/test-app';

const PNG = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000', 'hex');
const mention = (id: string) => `{{mention:${id}}}`;

describe('Task comments, replies, files and mentions (FR-66)', () => {
  const t = useTestApp();

  /** A manager, an assignee who gave himself nothing (the manager gave it), a follower, a colleague of the same category, and a stranger. */
  async function world() {
    const org = await t.factories.org();
    const manager = await t.factories.user({ unit: org.unitA, grants: [...taskManagerGrants('subtree'), ...TASK_COMMENT_GRANTS] });
    const assignee = await t.factories.user({ unit: org.unitA, grants: TASK_COMMENTER_GRANTS });
    const follower = await t.factories.user({ unit: org.unitA, grants: TASK_COMMENTER_GRANTS });
    const peer = await t.factories.user({ unit: org.unitC, grants: TASK_COMMENTER_GRANTS });
    const stranger = await t.factories.user({ unit: org.unitC, grants: TASK_COMMENTER_GRANTS });
    const foreign = await t.factories.user({ unit: org.unitOther, grants: TASK_COMMENTER_GRANTS });
    const admin = await t.factories.user({ grants: [ADMIN_MODE_GRANT, { key: P.TasksCommentRulesView, scope: 'all' }, { key: P.TasksCommentRulesEdit, scope: 'all' }, { key: P.TasksPoliciesView, scope: 'all' }, { key: P.TasksPoliciesEdit, scope: 'all' }] });
    await t.db.query('UPDATE employees SET manager_id = $1 WHERE id = $2', [manager.employeeId, assignee.employeeId]);
    await t.db.query('UPDATE org_nodes SET manager_id = $1 WHERE id = $2', [manager.employeeId, org.department]);
    const agents = {
      manager: await t.factories.signIn(manager),
      assignee: await t.factories.signIn(assignee),
      follower: await t.factories.signIn(follower),
      peer: await t.factories.signIn(peer),
      stranger: await t.factories.signIn(stranger),
      foreign: await t.factories.signIn(foreign),
      admin: await t.factories.signInAdminMode(admin),
    };
    const task = (await agents.manager.post('/api/tasks').send({ title: 'مهمة النقاش', assigneeUserId: assignee.id }).expect(201)).body as TaskDto;
    await t.db.query('INSERT INTO task_followers (task_id, user_id) VALUES ($1, $2)', [task.id, follower.id]);
    return { org, manager, assignee, follower, peer, stranger, foreign, agents, task };
  }

  type World = Awaited<ReturnType<typeof world>>;
  const url = (w: World, tail = '') => `/api/tasks/${w.task.id}/comments${tail}`;
  const post = async (agent: TestAgent, w: World, body: Record<string, unknown> = { body: 'مرحبا' }): Promise<TaskConversationDto> => (await agent.post(url(w)).send(body).expect(201)).body;
  const read = async (agent: TestAgent, w: World): Promise<TaskConversationDto> => (await agent.get(url(w)).expect(200)).body;
  const saveRules = (w: World, mutate: (m: ReturnType<typeof defaultCommentMatrix>) => void) => {
    const rules = defaultCommentMatrix();
    mutate(rules);
    return w.agents.admin.put(`/api/task-comment-rules?companyId=${w.org.companyId}`).send({ rules }).expect(200);
  };

  describe('Writing and reading', () => {
    it('lets the parties write and read: the assignee, whoever gave the task, and a follower', async () => {
      const w = await world();
      const first = await post(w.agents.assignee, w, { body: 'بدأت العمل' });
      expect(first.comments).toHaveLength(1);
      expect(first.comments[0]).toMatchObject({ body: 'بدأت العمل', author: { id: w.assignee.id }, parentId: null, isEdited: false, isDeleted: false, mayEdit: true, mayDelete: true });
      expect(first.task).toMatchObject({ id: w.task.id, number: w.task.number, title: 'مهمة النقاش' });
      expect(first.can).toEqual({ write: true, reply: true, upload: true, mention: true });
      await post(w.agents.manager, w, { body: 'تمام' });
      await post(w.agents.follower, w, { body: 'أتابع' });
      const seen = await read(w.agents.manager, w);
      expect(seen.comments.map((c) => c.body)).toEqual(['بدأت العمل', 'تمام', 'أتابع']);
      expect(seen.comments[0]?.mayEdit).toBe(false);
      expect(seen.isOutsider).toBe(false);
    });

    it('answers a comment one level deep, and an answer to an answer lands under the first comment naming whom it answers', async () => {
      const w = await world();
      const [root] = (await post(w.agents.assignee, w, { body: 'سؤال' })).comments;
      const answered = (await w.agents.manager.post(url(w, `/${root?.id}/replies`)).send({ body: 'جواب' }).expect(201)).body as TaskConversationDto;
      const answer = answered.comments[1];
      expect(answer).toMatchObject({ parentId: root?.id, replyTo: { id: w.assignee.id }, author: { id: w.manager.id } });
      const deeper = (await w.agents.assignee.post(url(w, `/${answer?.id}/replies`)).send({ body: 'شكرًا' }).expect(201)).body as TaskConversationDto;
      expect(deeper.comments[2]).toMatchObject({ parentId: root?.id, replyTo: { id: w.manager.id } });
    });

    it('refuses an empty comment, too long a text, unknown fields and a reply to a comment that does not exist', async () => {
      const w = await world();
      expect((await w.agents.assignee.post(url(w)).send({ body: '  ' }).expect(422)).body.code).toBe('TASK_COMMENT_EMPTY');
      await w.agents.assignee.post(url(w)).send({ body: 'x'.repeat(5001) }).expect(400);
      await w.agents.assignee.post(url(w)).send({ body: 'hi', authorUserId: w.manager.id }).expect(400);
      const missing = '00000000-0000-4000-8000-0000000000aa';
      expect((await w.agents.assignee.post(url(w, `/${missing}/replies`)).send({ body: 'x' }).expect(422)).body.code).toBe('TASK_COMMENT_REPLY_INVALID');
    });

    it('shows a stranger and another company nothing: 404, never 403', async () => {
      const w = await world();
      await post(w.agents.assignee, w);
      for (const who of ['stranger', 'foreign'] as const) {
        await w.agents[who].get(url(w)).expect(404);
        await w.agents[who].post(url(w)).send({ body: 'hi' }).expect(404);
        await w.agents[who].get(url(w, '/mentionables')).expect(404);
      }
      await w.agents.assignee.get('/api/tasks/00000000-0000-4000-8000-0000000000aa/comments').expect(404);
    });

    it('is closed to a person without the keys (403) while the task stays visible to them', async () => {
      const w = await world();
      const bare = await t.factories.user({ unit: w.org.unitA, grants: [{ key: P.TasksView, scope: 'own' }] });
      const agent = await t.factories.signIn(bare);
      await agent.get(url(w)).expect(403);
      await agent.post(url(w)).send({ body: 'hi' }).expect(403);
    });
  });

  describe('Edit and delete', () => {
    it('lets the author change the text with an «edited» mark, and nobody else', async () => {
      const w = await world();
      const [mine] = (await post(w.agents.assignee, w, { body: 'قبل' })).comments;
      const edited = (await w.agents.assignee.patch(url(w, `/${mine?.id}`)).send({ body: 'بعد' }).expect(200)).body as TaskConversationDto;
      expect(edited.comments[0]).toMatchObject({ body: 'بعد', isEdited: true });
      expect((await w.agents.manager.patch(url(w, `/${mine?.id}`)).send({ body: 'x' }).expect(403)).body.code).toBe('TASK_COMMENT_NOT_ALLOWED');
      await w.agents.assignee.patch(url(w, `/${mine?.id}`)).send({ body: '' }).expect(400);
    });

    it('closes the edit window by the policy minutes (a number an administrator sets)', async () => {
      const w = await world();
      const [mine] = (await post(w.agents.assignee, w)).comments;
      await t.db.query(`UPDATE task_comments SET created_at = now() - interval '16 minutes' WHERE id = $1`, [mine?.id]);
      expect((await w.agents.assignee.patch(url(w, `/${mine?.id}`)).send({ body: 'متأخر' }).expect(409)).body.code).toBe('TASK_COMMENT_EDIT_EXPIRED');
      expect((await w.agents.assignee.delete(url(w, `/${mine?.id}`)).expect(409)).body.code).toBe('TASK_COMMENT_EDIT_EXPIRED');
      expect((await read(w.agents.assignee, w)).comments[0]).toMatchObject({ mayEdit: false, mayDelete: false });
      await w.agents.admin.put(`/api/task-policies?companyId=${w.org.companyId}`).send({ objectionWorkingDays: 3, staleDays: 30, backdateDays: 7, urgentDays: 2, reminderDaysBefore: 1, digestWeekday: 0, standaloneRetentionDays: 30, commentMaxFiles: 5, commentEditMinutes: 60, commentLockDays: 0 }).expect(200);
      await w.agents.assignee.patch(url(w, `/${mine?.id}`)).send({ body: 'ما زال ممكنًا' }).expect(200);
    });

    it('deletes softly: the place stays with its replies, the text never comes back, the text is kept for the audit', async () => {
      const w = await world();
      const [root] = (await post(w.agents.assignee, w, { body: 'سيُحذف' })).comments;
      await w.agents.manager.post(url(w, `/${root?.id}/replies`)).send({ body: 'رد' }).expect(201);
      const after = (await w.agents.assignee.delete(url(w, `/${root?.id}`)).expect(200)).body as TaskConversationDto;
      expect(after.comments).toHaveLength(2);
      expect(after.comments[0]).toMatchObject({ isDeleted: true, body: '', mentions: [], files: [], mayEdit: false, mayDelete: false });
      expect(after.comments[1]).toMatchObject({ body: 'رد', parentId: root?.id });
      const kept: { body: string; deleted_by_user_id: string }[] = await t.db.query('SELECT body, deleted_by_user_id FROM task_comments WHERE id = $1', [root?.id]);
      expect(kept[0]).toMatchObject({ body: 'سيُحذف', deleted_by_user_id: w.assignee.id });
      expect((await w.agents.assignee.delete(url(w, `/${root?.id}`)).expect(409)).body.code).toBe('TASK_COMMENT_ALREADY_DELETED');
      await w.agents.manager.post(url(w, `/${root?.id}/replies`)).send({ body: 'x' }).expect(422);
    });

    it('lets a person with the delete-any key remove another person\'s comment, past the window', async () => {
      const w = await world();
      const [mine] = (await post(w.agents.assignee, w)).comments;
      await t.db.query(`UPDATE task_comments SET created_at = now() - interval '2 days' WHERE id = $1`, [mine?.id]);
      expect((await w.agents.manager.delete(url(w, `/${mine?.id}`)).expect(403)).body.code).toBe('TASK_COMMENT_NOT_ALLOWED');
      const mod = await t.factories.user({ unit: w.org.unitA, grants: [...taskManagerGrants('subtree'), ...TASK_COMMENT_GRANTS, { key: P.TasksCommentDeleteAny, scope: 'all' }] });
      const agent = await t.factories.signIn(mod);
      await t.db.query('UPDATE employees SET manager_id = $1 WHERE id = $2', [mod.employeeId, w.assignee.employeeId]);
      expect((await agent.delete(url(w, `/${mine?.id}`)).expect(200)).body.comments[0].isDeleted).toBe(true);
    });
  });

  describe('Files', () => {
    it('attaches the author\'s own uploads (up to the policy count), readable by the readers of the conversation only', async () => {
      const w = await world();
      const file = (await w.agents.assignee.post('/api/files').attach('file', PNG, 'screen.png').expect(201)).body;
      const strangerFile = (await w.agents.stranger.post('/api/files').attach('file', PNG, 'other.png').expect(201)).body;
      expect((await w.agents.assignee.post(url(w)).send({ body: '', fileIds: [strangerFile.id] }).expect(422)).body.code).toBe('TASK_COMMENT_FILE_INVALID');
      const done = await post(w.agents.assignee, w, { body: '', fileIds: [file.id] });
      const comment = done.comments[0];
      expect(comment?.files).toEqual([{ id: file.id, name: 'screen.png', size: PNG.length, contentType: 'image/png' }]);
      for (const who of ['assignee', 'manager', 'follower'] as const) await w.agents[who].get(url(w, `/${comment?.id}/files/${file.id}`)).expect(200);
      await w.agents.stranger.get(url(w, `/${comment?.id}/files/${file.id}`)).expect(404);
      await w.agents.manager.get(url(w, `/${comment?.id}/files/${strangerFile.id}`)).expect(404);
    });

    it('refuses more files than the policy allows, the same file twice, and an upload when the matrix says no', async () => {
      const w = await world();
      const files = [];
      for (let i = 0; i < 6; i++) files.push((await w.agents.assignee.post('/api/files').attach('file', PNG, `f${i}.png`).expect(201)).body.id as string);
      expect((await w.agents.assignee.post(url(w)).send({ fileIds: files }).expect(422)).body.code).toBe('TASK_COMMENT_TOO_MANY_FILES');
      expect((await w.agents.assignee.post(url(w)).send({ fileIds: [files[0], files[0]] }).expect(422)).body.code).toBe('TASK_COMMENT_FILE_INVALID');
      await saveRules(w, (m) => { m.assignee.upload = false; });
      expect((await w.agents.assignee.post(url(w)).send({ body: 'hi', fileIds: [files[0]] }).expect(403)).body.code).toBe('TASK_COMMENT_NOT_ALLOWED');
    });

    it('does not serve the files of a deleted comment', async () => {
      const w = await world();
      const file = (await w.agents.assignee.post('/api/files').attach('file', PNG, 'screen.png').expect(201)).body;
      const [comment] = (await post(w.agents.assignee, w, { body: 'x', fileIds: [file.id] })).comments;
      await w.agents.assignee.delete(url(w, `/${comment?.id}`)).expect(200);
      await w.agents.manager.get(url(w, `/${comment?.id}/files/${file.id}`)).expect(404);
    });
  });

  describe('The matrix: who may do what (dynamic)', () => {
    it('shows the defaults until an administrator saves, then the saved cells', async () => {
      const w = await world();
      const before = (await w.agents.admin.get(`/api/task-comment-rules?companyId=${w.org.companyId}`).expect(200)).body as CommentRulesDto;
      expect(before).toEqual({ companyId: w.org.companyId, rules: defaultCommentMatrix() });
      const changed = defaultCommentMatrix();
      changed.follower.write = false;
      const saved = (await w.agents.admin.put(`/api/task-comment-rules?companyId=${w.org.companyId}`).send({ rules: changed }).expect(200)).body as CommentRulesDto;
      expect(saved.rules.follower.write).toBe(false);
      expect(saved.rules.assignee.write).toBe(true);
      expect(COMMENT_RELATIONS.length * COMMENT_ACTIONS.length).toBe(56);
      const count: { n: string }[] = await t.db.query('SELECT count(*)::text AS n FROM task_comment_rules WHERE company_id = $1', [w.org.companyId]);
      expect(count[0]?.n).toBe('56');
    });

    it('validates the matrix: every cell present, booleans only, no unknown relation', async () => {
      const w = await world();
      const put = (body: unknown) => w.agents.admin.put(`/api/task-comment-rules?companyId=${w.org.companyId}`).send(body as object);
      const full = defaultCommentMatrix();
      await put({ rules: { ...full, assignee: { read: true } } }).expect(400);
      await put({ rules: { ...full, assignee: { ...full.assignee, read: 'yes' } } }).expect(400);
      await put({ rules: { ...full, stranger: full.assignee } }).expect(400);
      await put({}).expect(400);
    });

    it('applies a changed cell at once: a follower who may no longer write gets 403 but still reads', async () => {
      const w = await world();
      await post(w.agents.follower, w, { body: 'قبل' });
      await saveRules(w, (m) => { m.follower.write = false; m.follower.reply = false; });
      expect((await w.agents.follower.post(url(w)).send({ body: 'بعد' }).expect(403)).body.code).toBe('TASK_COMMENT_NOT_ALLOWED');
      const seen = await read(w.agents.follower, w);
      expect(seen.comments).toHaveLength(1);
      expect(seen.can).toMatchObject({ write: false, reply: false });
    });

    it('takes the conversation away from a relation whose read cell is off (404)', async () => {
      const w = await world();
      await saveRules(w, (m) => { m.follower.read = false; });
      await w.agents.follower.get(url(w)).expect(404);
      await read(w.agents.assignee, w);
    });

    it('needs the key as well as the cell: the matrix alone grants nothing', async () => {
      const w = await world();
      const noWrite = await t.factories.user({ unit: w.org.unitA, grants: [...TASK_COMMENT_GRANTS.filter((g) => g.key !== P.TasksCommentAdd)] });
      await t.db.query('INSERT INTO task_followers (task_id, user_id) VALUES ($1, $2)', [w.task.id, noWrite.id]);
      const agent = await t.factories.signIn(noWrite);
      await read(agent, w);
      await agent.post(url(w)).send({ body: 'x' }).expect(403);
    });

    it('is an administrator page: admin mode and its own keys are required', async () => {
      const w = await world();
      const asUser = await t.factories.signIn(await t.factories.user({ grants: [ADMIN_MODE_GRANT, { key: P.TasksCommentRulesView, scope: 'all' }] }));
      await asUser.get('/api/task-comment-rules').expect(403);
      await w.agents.assignee.get('/api/task-comment-rules').expect(403);
      const viewOnly = await t.factories.signInAdminMode(await t.factories.user({ grants: [ADMIN_MODE_GRANT, { key: P.TasksCommentRulesView, scope: 'all' }] }));
      await viewOnly.get(`/api/task-comment-rules?companyId=${w.org.companyId}`).expect(200);
      await viewOnly.put(`/api/task-comment-rules?companyId=${w.org.companyId}`).send({ rules: defaultCommentMatrix() }).expect(403);
    });

    it('audits a change of the matrix without any text', async () => {
      const w = await world();
      await saveRules(w, (m) => { m.manager.delete_own = false; });
      const rows: { action: string }[] = await t.db.query(`SELECT action FROM audit_logs WHERE action = 'task.comment_rules_changed'`);
      expect(rows).toHaveLength(1);
    });
  });

  describe('Colleagues of the category and mentioned people (outsiders)', () => {
    async function categorised(w: World) {
      const tagId = (await w.agents.manager.get('/api/tasks/options').expect(200)).body.tags[0]?.id as string | undefined;
      expect(tagId).toBeUndefined();
      const tag: { id: string }[] = await t.db.query(`INSERT INTO task_tags (org_node_id, name_ar, name_en) VALUES ($1, 'عام', 'General') RETURNING id`, [w.org.department]);
      const id = (tag[0] as { id: string }).id;
      await t.db.query('UPDATE tasks SET tag_id = $1 WHERE id = $2', [id, w.task.id]);
      return id;
    }

    it('lets a colleague with an open task of the same category read and write, seeing the number and title only', async () => {
      const w = await world();
      const tagId = await categorised(w);
      await post(w.agents.assignee, w, { body: 'نقاش' });
      await w.agents.peer.get(url(w)).expect(404);
      const own = (await w.agents.peer.post('/api/tasks').send({ title: 'مهمتي', assigneeUserId: w.peer.id }).expect(201)).body as TaskDto;
      await t.db.query(`UPDATE tasks SET tag_id = $1, status = 'todo' WHERE id = $2`, [tagId, own.id]);
      const seen = await read(w.agents.peer, w);
      expect(seen).toMatchObject({ isOutsider: true, task: { title: 'مهمة النقاش' }, can: { write: true, reply: true, upload: false, mention: false } });
      await post(w.agents.peer, w, { body: 'من زميل' });
      await w.agents.peer.get(`/api/tasks/${w.task.id}`).expect(404);
      const mine = (await w.agents.peer.get('/api/tasks').expect(200)).body.items as { id: string }[];
      expect(mine.map((x) => x.id)).not.toContain(w.task.id);
      await t.db.query(`UPDATE tasks SET status = 'done' WHERE id = $1`, [own.id]);
      await w.agents.peer.get(url(w)).expect(404);
    });

    it('does not count a colleague of another category, nor a task without a category', async () => {
      const w = await world();
      await categorised(w);
      const other: { id: string }[] = await t.db.query(`INSERT INTO task_tags (org_node_id, name_ar, name_en) VALUES ($1, 'آخر', 'Other') RETURNING id`, [w.org.department]);
      const own = (await w.agents.peer.post('/api/tasks').send({ title: 'مهمتي', assigneeUserId: w.peer.id }).expect(201)).body as TaskDto;
      await t.db.query(`UPDATE tasks SET tag_id = $1, status = 'todo' WHERE id = $2`, [other[0]?.id, own.id]);
      await w.agents.peer.get(url(w)).expect(404);
    });

    it('mentions any active employee of the company: they join the conversation, see the title and nothing else', async () => {
      const w = await world();
      const body = `${mention(w.stranger.id)} انظر هنا`;
      const done = await post(w.agents.assignee, w, { body });
      expect(done.comments[0]?.mentions).toEqual([{ id: w.stranger.id, name: expect.any(String) }]);
      const seen = await read(w.agents.stranger, w);
      expect(seen).toMatchObject({ isOutsider: true, task: { id: w.task.id }, can: { write: true } });
      await w.agents.stranger.get(`/api/tasks/${w.task.id}`).expect(404);
      await post(w.agents.stranger, w, { body: 'شكرًا' });
    });

    it('refuses a mention of another company, of an unknown person, and when the matrix forbids mentioning', async () => {
      const w = await world();
      expect((await w.agents.assignee.post(url(w)).send({ body: mention(w.foreign.id) }).expect(422)).body.code).toBe('TASK_COMMENT_MENTION_INVALID');
      expect((await w.agents.assignee.post(url(w)).send({ body: mention('00000000-0000-4000-8000-0000000000aa') }).expect(422)).body.code).toBe('TASK_COMMENT_MENTION_INVALID');
      await saveRules(w, (m) => { m.assignee.mention = false; });
      expect((await w.agents.assignee.post(url(w)).send({ body: mention(w.stranger.id) }).expect(403)).body.code).toBe('TASK_COMMENT_NOT_ALLOWED');
      await w.agents.assignee.get(url(w, '/mentionables')).expect(403);
    });

    it('closes the mention\'s door again when the matrix turns the «mentioned» relation off', async () => {
      const w = await world();
      await saveRules(w, (m) => { m.mentioned.read = false; });
      await post(w.agents.assignee, w, { body: mention(w.stranger.id) });
      await w.agents.stranger.get(url(w)).expect(404);
    });

    it('offers the @ list: active employees of the task\'s company, filtered by name', async () => {
      const w = await world();
      const everyone = (await w.agents.assignee.get(url(w, '/mentionables')).expect(200)).body as { id: string; name: string }[];
      const ids = everyone.map((p) => p.id);
      expect(ids).toEqual(expect.arrayContaining([w.manager.id, w.stranger.id, w.peer.id]));
      expect(ids).not.toContain(w.foreign.id);
      const one = everyone.find((p) => p.id === w.stranger.id);
      const found = (await w.agents.assignee.get(url(w, `/mentionables?search=${encodeURIComponent(one?.name ?? '')}`)).expect(200)).body as { id: string }[];
      expect(found.map((p) => p.id)).toContain(w.stranger.id);
      expect(found.length).toBeLessThan(ids.length);
      await t.db.query('UPDATE users SET is_active = false WHERE id = $1', [w.stranger.id]);
      expect(((await w.agents.assignee.get(url(w, '/mentionables')).expect(200)).body as { id: string }[]).map((p) => p.id)).not.toContain(w.stranger.id);
    });

    it('keeps the mentions in step with an edit: a new name needs the mention action, an old one does not', async () => {
      const w = await world();
      const [c] = (await post(w.agents.assignee, w, { body: `${mention(w.stranger.id)} هل` })).comments;
      await saveRules(w, (m) => { m.assignee.mention = false; });
      await w.agents.assignee.patch(url(w, `/${c?.id}`)).send({ body: `${mention(w.stranger.id)} نعم` }).expect(200);
      await w.agents.assignee.patch(url(w, `/${c?.id}`)).send({ body: `${mention(w.peer.id)} نعم` }).expect(403);
      await saveRules(w, () => undefined);
      const edited = (await w.agents.assignee.patch(url(w, `/${c?.id}`)).send({ body: 'بلا ذكر' }).expect(200)).body as TaskConversationDto;
      expect(edited.comments[0]?.mentions).toEqual([]);
    });
  });

  describe('Closed and archived tasks', () => {
    it('stays open after «done», is read-only once archived, and opens again on restore', async () => {
      const w = await world();
      await t.db.query(`UPDATE tasks SET status = 'done', completed_at = now() WHERE id = $1`, [w.task.id]);
      await post(w.agents.assignee, w, { body: 'بعد الإنجاز' });
      await t.db.query(`UPDATE tasks SET archived_at = now() WHERE id = $1`, [w.task.id]);
      const seen = await read(w.agents.assignee, w);
      expect(seen).toMatchObject({ locked: true, can: { write: false, reply: false, upload: false, mention: false } });
      expect(seen.comments[0]).toMatchObject({ mayEdit: false, mayDelete: false });
      expect((await w.agents.assignee.post(url(w)).send({ body: 'x' }).expect(409)).body.code).toBe('TASK_COMMENT_CLOSED');
      await t.db.query('UPDATE tasks SET archived_at = NULL WHERE id = $1', [w.task.id]);
      await post(w.agents.assignee, w, { body: 'بعد الاسترجاع' });
    });

    it('locks the conversation the policy days after the task closed (0 = never)', async () => {
      const w = await world();
      await t.db.query(`UPDATE tasks SET status = 'done', completed_at = now() - interval '10 days' WHERE id = $1`, [w.task.id]);
      await post(w.agents.assignee, w, { body: 'ما زال مفتوحًا' });
      const put = (days: number) => w.agents.admin.put(`/api/task-policies?companyId=${w.org.companyId}`).send({ objectionWorkingDays: 3, staleDays: 30, backdateDays: 7, urgentDays: 2, reminderDaysBefore: 1, digestWeekday: 0, standaloneRetentionDays: 30, commentMaxFiles: 5, commentEditMinutes: 15, commentLockDays: days }).expect(200);
      await put(7);
      expect((await w.agents.assignee.post(url(w)).send({ body: 'x' }).expect(409)).body.code).toBe('TASK_COMMENT_CLOSED');
      expect((await read(w.agents.assignee, w)).locked).toBe(true);
      await put(0);
      await post(w.agents.assignee, w, { body: 'عاد مفتوحًا' });
    });
  });

  describe('Notices', () => {
    const notices = async (agent: TestAgent) => (await agent.get('/api/notifications').expect(200)).body.items as { link: string; titleEn: string; bodyEn: string }[];
    const conversation = (w: World) => `/tasks/${w.task.id}/conversation`;

    it('tells the mentioned person (also by e-mail, without the text), the assignee and whoever gave the task, never the author', async () => {
      const w = await world();
      t.mail.sent.length = 0;
      await post(w.agents.follower, w, { body: `${mention(w.stranger.id)} رقم الحساب 123456` });
      const mentioned = await notices(w.agents.stranger);
      expect(mentioned).toHaveLength(1);
      expect(mentioned[0]).toMatchObject({ link: conversation(w) });
      expect(mentioned[0]?.titleEn).toContain('mentioned you');
      await t.app.get(OutboxRelay).flush();
      const mails = t.mail.sent.filter((m) => m.to === w.stranger.email);
      expect(mails).toHaveLength(1);
      expect(JSON.stringify(mails)).not.toContain('123456');
      for (const who of ['assignee', 'manager'] as const) expect((await notices(w.agents[who])).filter((n) => n.link === conversation(w))).toHaveLength(1);
      expect((await notices(w.agents.follower)).filter((n) => n.link === conversation(w))).toHaveLength(0);
      expect(JSON.stringify(await notices(w.agents.assignee))).not.toContain('123456');
    });

    it('tells whom a reply answers (once, by that reason), and a follower only once while an earlier notice is unread', async () => {
      const w = await world();
      const [root] = (await post(w.agents.assignee, w, { body: 'سؤال' })).comments;
      await w.agents.manager.post(url(w, `/${root?.id}/replies`)).send({ body: 'جواب' }).expect(201);
      const assigneeNotices = (await notices(w.agents.assignee)).filter((n) => n.link === conversation(w));
      expect(assigneeNotices).toHaveLength(1);
      expect(assigneeNotices[0]?.titleEn).toContain('replied to your comment');
      await post(w.agents.manager, w, { body: 'ثانية' });
      await post(w.agents.manager, w, { body: 'ثالثة' });
      expect((await notices(w.agents.follower)).filter((n) => n.link === conversation(w))).toHaveLength(1);
      await w.agents.follower.post('/api/notifications/read-all').expect(200);
      await post(w.agents.manager, w, { body: 'رابعة' });
      expect((await notices(w.agents.follower)).filter((n) => n.link === conversation(w))).toHaveLength(2);
    });

    it('tells only the new name when an edit mentions somebody else', async () => {
      const w = await world();
      const [c] = (await post(w.agents.assignee, w, { body: `${mention(w.stranger.id)} هل` })).comments;
      const before = (await notices(w.agents.stranger)).length;
      const managerBefore = (await notices(w.agents.manager)).length;
      await w.agents.assignee.patch(url(w, `/${c?.id}`)).send({ body: `${mention(w.stranger.id)} ${mention(w.peer.id)} هل` }).expect(200);
      expect((await notices(w.agents.stranger)).length).toBe(before);
      expect(await notices(w.agents.peer)).toHaveLength(1);
      expect((await notices(w.agents.manager)).length).toBe(managerBefore);
    });
  });

  describe('Audit and privacy', () => {
    it('audits comments with ids and counts, never the text', async () => {
      const w = await world();
      const [c] = (await post(w.agents.assignee, w, { body: 'نص سري جدًا' })).comments;
      await w.agents.assignee.patch(url(w, `/${c?.id}`)).send({ body: 'نص سري معدّل' }).expect(200);
      await w.agents.assignee.delete(url(w, `/${c?.id}`)).expect(200);
      const rows: { action: string; changes: unknown }[] = await t.db.query(`SELECT action, changes FROM audit_logs WHERE action LIKE 'task.comment_%' ORDER BY created_at`);
      expect(rows.map((r) => r.action)).toEqual(['task.comment_added', 'task.comment_edited', 'task.comment_deleted']);
      expect(JSON.stringify(rows)).not.toContain('سري');
    });
  });
});
