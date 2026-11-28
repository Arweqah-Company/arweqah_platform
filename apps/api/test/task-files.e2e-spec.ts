import { CorePermission as P, MAX_TASK_FILES, type TaskDto, type TaskStatus } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import type { TestAgent } from './factories/factories';
import { TASK_EMPLOYEE_GRANTS, TASK_FILE_GRANTS, taskManagerGrants } from './factories/task-grants';
import { DOCX, XLSX } from './helpers/office-files';
import { useTestApp } from './setup/test-app';

const PNG = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000', 'hex');

describe('Files on tasks: reference files, delivery files, preview (FR-212, FR-213, FR-214)', () => {
  const t = useTestApp();

  /** A manager who gives the task, the direct report who does it, a peer who sees nothing, a follower who holds the file keys, and a doer without them (the Employee role's own keys taken out). */
  async function world() {
    const org = await t.factories.org();
    const manager = await t.factories.user({ unit: org.unitA, grants: [...taskManagerGrants('subtree'), ...TASK_FILE_GRANTS] });
    const report = await t.factories.user({ unit: org.unitA, grants: [...TASK_EMPLOYEE_GRANTS, ...TASK_FILE_GRANTS] });
    const peer = await t.factories.user({ unit: org.unitC, grants: [...TASK_EMPLOYEE_GRANTS, ...TASK_FILE_GRANTS] });
    const keyless = await t.factories.user({ unit: org.unitA, grants: TASK_EMPLOYEE_GRANTS, without: ['tasks.file_'] });
    const follower = await t.factories.user({ unit: org.unitC, grants: [...TASK_EMPLOYEE_GRANTS, ...TASK_FILE_GRANTS] });
    await t.db.query('UPDATE employees SET manager_id = $1 WHERE id = $2', [manager.employeeId, report.employeeId]);
    await t.db.query('UPDATE employees SET manager_id = $1 WHERE id = $2', [manager.employeeId, keyless.employeeId]);
    const agents = { manager: await t.factories.signIn(manager), report: await t.factories.signIn(report), peer: await t.factories.signIn(peer), keyless: await t.factories.signIn(keyless), follower: await t.factories.signIn(follower) };
    const upload = async (agent: TestAgent, buffer: Buffer, name: string) => (await agent.post('/api/files').attach('file', buffer, name).expect(201)).body as { id: string; contentType: string };
    const given = async (body: Record<string, unknown> = {}, to: { id: string } = report): Promise<TaskDto> => {
      const task = (await agents.manager.post('/api/tasks').send({ title: 'مهمة', assigneeUserId: to.id, ...body }).expect(201)).body as TaskDto;
      await t.db.query('INSERT INTO task_followers (task_id, user_id) VALUES ($1, $2)', [task.id, follower.id]);
      return task;
    };
    return { org, manager, report, peer, keyless, follower, agents, upload, given };
  }

  const move = (agent: TestAgent, task: Pick<TaskDto, 'id' | 'revision'>, to: TaskStatus, extra: Record<string, unknown> = {}) => agent.post(`/api/tasks/${task.id}/transition`).send({ to, revision: task.revision, ...extra });

  describe('FR-212: reference files when a task is made and later', () => {
    it('keeps the files sent with a new task as reference files, with a preview and a download for whoever sees the task', async () => {
      const w = await world();
      const doc = await w.upload(w.agents.manager, DOCX, 'brief.docx');
      const sheet = await w.upload(w.agents.manager, XLSX, 'figures.xlsx');
      const png = await w.upload(w.agents.manager, PNG, 'screen.png');
      const task = await w.given({ fileIds: [doc.id, sheet.id, png.id] });
      expect(task.files.map((f) => [f.name, f.kind, f.addedBy.id]).sort()).toEqual([
        ['brief.docx', 'reference', w.manager.id],
        ['figures.xlsx', 'reference', w.manager.id],
        ['screen.png', 'reference', w.manager.id],
      ]);
      const seen = (await w.agents.report.get(`/api/tasks/${task.id}`).expect(200)).body as TaskDto;
      expect(seen.files).toHaveLength(3);
      expect(seen.files.every((f) => f.canRemove)).toBe(true); // the doer may edit their own task, so may take a file off
      const asFollower = (await w.agents.follower.get(`/api/tasks/${task.id}`).expect(200)).body as TaskDto;
      expect(asFollower.files).toHaveLength(3);
      expect(asFollower.files.every((f) => !f.canRemove)).toBe(true); // a follower reads and previews but changes nothing
      await w.agents.follower.get(`/api/tasks/${task.id}/files/${png.id}/preview`).expect(200);
      await w.agents.report.get(`/api/tasks/${task.id}/files/${png.id}`).expect(200).expect('content-type', /image\/png/);
      await w.agents.report.get(`/api/tasks/${task.id}/files/${png.id}/preview`).expect(200);
      await w.agents.report.get(`/api/tasks/${task.id}/files/${doc.id}/preview`).expect(200);
    });

    it('refuses files with no key (403), another person\'s file (404), too many files (400) and unknown fields', async () => {
      const w = await world();
      const own = await w.upload(w.agents.keyless, PNG, 'mine.png');
      await w.agents.keyless.post('/api/tasks').send({ title: 'x', fileIds: [own.id] }).expect(403);
      await w.agents.keyless.post('/api/tasks').send({ title: 'x' }).expect(201); // no files: no key needed
      const theirs = await w.upload(w.agents.report, PNG, 'theirs.png');
      await w.agents.manager.post('/api/tasks').send({ title: 'x', fileIds: [theirs.id] }).expect(404);
      await w.agents.manager.post('/api/tasks').send({ title: 'x', fileIds: Array.from({ length: MAX_TASK_FILES + 1 }, () => crypto.randomUUID()) }).expect(400);
      await w.agents.manager.post('/api/tasks').send({ title: 'x', fileIds: ['not-a-uuid'] }).expect(400);
    });

    it('lets whoever may edit the task add reference files and take them off, and writes the history and the audit', async () => {
      const w = await world();
      const task = await w.given();
      const file = await w.upload(w.agents.manager, DOCX, 'later.docx');
      const after = (await w.agents.manager.post(`/api/tasks/${task.id}/files`).send({ fileIds: [file.id] }).expect(200)).body as TaskDto;
      expect(after.files).toMatchObject([{ name: 'later.docx', kind: 'reference', canRemove: true }]);
      expect(after.abilities.addFiles).toBe(true);
      expect(after.events.at(-1)).toMatchObject({ type: 'file_added', note: 'later.docx', actor: { id: w.manager.id } });
      const audit = await t.db.query("SELECT changes FROM audit_logs WHERE action = 'task.files_added' AND entity_id = $1", [task.id]);
      expect(audit.map((r: { changes: unknown }) => r.changes)).toEqual([{ files: 1 }]);
      const removed = (await w.agents.manager.delete(`/api/tasks/${task.id}/files/${file.id}`).expect(200)).body as TaskDto;
      expect(removed.files).toEqual([]);
      expect(removed.events.at(-1)).toMatchObject({ type: 'file_removed', note: 'later.docx' });
    });

    it('answers 403 to a viewer who may not edit the task or lacks the key, 404 outside the task, and 400 on an empty list', async () => {
      const w = await world();
      const task = await w.given();
      const own = await w.upload(w.agents.report, PNG, 'x.png');
      await w.agents.report.post(`/api/tasks/${task.id}/files`).send({ fileIds: [own.id] }).expect(200); // the doer may edit their own task
      const asFollower = await w.upload(w.agents.follower, PNG, 'f.png');
      await w.agents.follower.post(`/api/tasks/${task.id}/files`).send({ fileIds: [asFollower.id] }).expect(403); // holds the key, may not edit the task
      const keyless = await w.upload(w.agents.keyless, PNG, 'k.png');
      const mine = await w.given({}, w.keyless);
      await w.agents.keyless.post(`/api/tasks/${mine.id}/files`).send({ fileIds: [keyless.id] }).expect(403); // may edit their task but lacks the key
      const other = await w.upload(w.agents.peer, PNG, 'p.png');
      await w.agents.peer.post(`/api/tasks/${task.id}/files`).send({ fileIds: [other.id] }).expect(404);
      await w.agents.manager.post(`/api/tasks/${task.id}/files`).send({ fileIds: [] }).expect(400);
      await w.agents.peer.get(`/api/tasks/${task.id}/files/${own.id}`).expect(404);
    });

    it('does not serve a file that is not on this task, and adds a file once', async () => {
      const w = await world();
      const task = await w.given();
      const other = await w.given();
      const file = await w.upload(w.agents.manager, PNG, 'a.png');
      await w.agents.manager.post(`/api/tasks/${other.id}/files`).send({ fileIds: [file.id] }).expect(200);
      await w.agents.manager.get(`/api/tasks/${task.id}/files/${file.id}`).expect(404);
      const again = (await w.agents.manager.post(`/api/tasks/${other.id}/files`).send({ fileIds: [file.id] }).expect(200)).body as TaskDto;
      expect(again.files).toHaveLength(1);
      expect(again.events.filter((e) => e.type === 'file_added')).toHaveLength(1);
    });
  });

  describe('FR-213: delivery files from the doer', () => {
    it('lets the assignee hand in delivery files while the work is under way, and no one else', async () => {
      const w = await world();
      const task = await w.given();
      const file = await w.upload(w.agents.report, DOCX, 'result.docx');
      await w.agents.report.post(`/api/tasks/${task.id}/deliveries`).send({ fileIds: [file.id] }).expect(403); // not started yet
      const started = (await move(w.agents.report, task, 'in_progress').expect(200)).body as TaskDto;
      expect(started.abilities.deliverFiles).toBe(true);
      const mine = (await w.agents.report.post(`/api/tasks/${task.id}/deliveries`).send({ fileIds: [file.id] }).expect(200)).body as TaskDto;
      expect(mine.files).toMatchObject([{ name: 'result.docx', kind: 'delivery', addedBy: { id: w.report.id }, canRemove: true }]);
      expect(mine.events.at(-1)).toMatchObject({ type: 'delivery_added', note: 'result.docx' });
      const theirs = await w.upload(w.agents.manager, PNG, 'giver.png');
      await w.agents.manager.post(`/api/tasks/${task.id}/deliveries`).send({ fileIds: [theirs.id] }).expect(200); // a manager of the team moves the task for them, so may also deliver
      const asManager = (await w.agents.manager.get(`/api/tasks/${task.id}`).expect(200)).body as TaskDto;
      expect(asManager.files.find((f) => f.name === 'result.docx')?.canRemove).toBe(true); // the giver may edit the task: they may take a file off
      const asFollower = await w.upload(w.agents.follower, PNG, 'f.png');
      await w.agents.follower.post(`/api/tasks/${task.id}/deliveries`).send({ fileIds: [asFollower.id] }).expect(403); // holds the key, does not do the work
    });

    it('does not let a doer without the delivery key hand in files, with the move or alone', async () => {
      const w = await world();
      const task = await w.given({}, w.keyless);
      const started = (await move(w.agents.keyless, task, 'in_progress').expect(200)).body as TaskDto;
      expect(started.abilities.deliverFiles).toBe(false);
      const file = await w.upload(w.agents.keyless, PNG, 'x.png');
      await w.agents.keyless.post(`/api/tasks/${task.id}/deliveries`).send({ fileIds: [file.id] }).expect(403);
      await move(w.agents.keyless, started, 'done', { fileIds: [file.id] }).expect(403);
      expect((await w.agents.keyless.get(`/api/tasks/${task.id}`).expect(200)).body).toMatchObject({ status: 'in_progress', files: [] });
      expect((await move(w.agents.keyless, started, 'done').expect(200)).body.status).toBe('done'); // finishing with no file still works
    });

    it('takes delivery files with the move that finishes the work and keeps them, with a history entry', async () => {
      const w = await world();
      const task = await w.given();
      const started = (await move(w.agents.report, task, 'in_progress').expect(200)).body as TaskDto;
      const deck = await w.upload(w.agents.report, DOCX, 'final.docx');
      const done = (await move(w.agents.report, started, 'done', { fileIds: [deck.id] }).expect(200)).body as TaskDto;
      expect(done.status).toBe('done');
      expect(done.files).toMatchObject([{ name: 'final.docx', kind: 'delivery', canRemove: false }]);
      expect(done.events.map((e) => e.type).slice(-2)).toEqual(['transitioned', 'delivery_added']);
      await w.agents.manager.get(`/api/tasks/${task.id}/files/${deck.id}`).expect(200);
    });

    it('takes delivery files with the move to review for a task that needs review', async () => {
      const w = await world();
      const task = await w.given({ needsReview: true });
      const started = (await move(w.agents.report, task, 'in_progress').expect(200)).body as TaskDto;
      const file = await w.upload(w.agents.report, XLSX, 'sheet.xlsx');
      const waiting = (await move(w.agents.report, started, 'awaiting_review', { fileIds: [file.id] }).expect(200)).body as TaskDto;
      expect(waiting).toMatchObject({ status: 'awaiting_review', files: [{ kind: 'delivery' }] });
    });

    it('refuses files with a move that does not finish the work (422), from someone who is not the doer (403) and another person\'s file (404)', async () => {
      const w = await world();
      const task = await w.given();
      const file = await w.upload(w.agents.report, PNG, 'early.png');
      expect((await move(w.agents.report, task, 'in_progress', { fileIds: [file.id] }).expect(422)).body.code).toBe('TASK_FILES_NOT_ALLOWED');
      const started = (await move(w.agents.report, task, 'in_progress').expect(200)).body as TaskDto;
      const theirs = await w.upload(w.agents.manager, PNG, 'not-yours.png');
      await move(w.agents.report, started, 'done', { fileIds: [theirs.id] }).expect(404);
      await move(w.agents.peer, started, 'done', { fileIds: [file.id] }).expect(404); // sees nothing of the task
      const stillStarted = (await w.agents.report.get(`/api/tasks/${task.id}`).expect(200)).body as TaskDto;
      expect(stillStarted).toMatchObject({ status: 'in_progress', files: [] }); // a refused move leaves no file behind
    });

    it('refuses files on a finished task and refuses taking a file off it', async () => {
      const w = await world();
      const task = await w.given();
      const started = (await move(w.agents.report, task, 'in_progress').expect(200)).body as TaskDto;
      const deck = await w.upload(w.agents.report, DOCX, 'final.docx');
      const done = (await move(w.agents.report, started, 'done', { fileIds: [deck.id] }).expect(200)).body as TaskDto;
      const late = await w.upload(w.agents.report, PNG, 'late.png');
      await w.agents.report.post(`/api/tasks/${done.id}/deliveries`).send({ fileIds: [late.id] }).expect(403);
      await w.agents.manager.post(`/api/tasks/${done.id}/files`).send({ fileIds: [late.id] }).expect(403);
      await w.agents.report.delete(`/api/tasks/${done.id}/files/${deck.id}`).expect(403);
    });
  });

  describe('FR-214: taking a file off', () => {
    it('lets who attached a file take it off, and refuses a follower who neither attached it nor may edit the task', async () => {
      const w = await world();
      const reference = await w.upload(w.agents.manager, PNG, 'ref.png');
      const task = await w.given({ fileIds: [reference.id] });
      const started = (await move(w.agents.report, task, 'in_progress').expect(200)).body as TaskDto;
      const mine = await w.upload(w.agents.report, PNG, 'mine.png');
      await w.agents.report.post(`/api/tasks/${task.id}/deliveries`).send({ fileIds: [mine.id] }).expect(200);
      await w.agents.follower.delete(`/api/tasks/${started.id}/files/${reference.id}`).expect(403); // holds the key, neither attached it nor may edit the task
      await w.agents.follower.delete(`/api/tasks/${started.id}/files/${mine.id}`).expect(403);
      await w.agents.peer.delete(`/api/tasks/${started.id}/files/${mine.id}`).expect(404);
      const after = (await w.agents.report.delete(`/api/tasks/${started.id}/files/${mine.id}`).expect(200)).body as TaskDto;
      expect(after.files.map((f) => f.name)).toEqual(['ref.png']);
      await w.agents.report.delete(`/api/tasks/${started.id}/files/${mine.id}`).expect(404);
    });

    it('declares the three keys', async () => {
      const keys = [P.TasksFileAdd, P.TasksFileDeliver, P.TasksFileRemove];
      expect(keys).toEqual(['tasks.file_add', 'tasks.file_deliver', 'tasks.file_remove']);
    });
  });
});
