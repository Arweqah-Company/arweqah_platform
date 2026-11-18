import { CorePermission as P, type TaskDto, type TaskFollowerDto } from '@arweqah-platform/shared';
import { describe, expect, it, vi } from 'vitest';
import type { TestAgent } from './factories/factories';
import { TASK_EMPLOYEE_GRANTS, taskManagerGrants } from './factories/task-grants';
import { useTestApp } from './setup/test-app';

describe('Followers chosen by the assignee, the giver or a manager (FR-163)', () => {
  const t = useTestApp();

  async function world() {
    const org = await t.factories.org();
    const manager = await t.factories.user({ unit: org.unitA, grants: [...taskManagerGrants('subtree'), { key: P.TasksFollowersManage, scope: 'subtree' }] });
    const owner = await t.factories.user({ unit: org.unitA, grants: TASK_EMPLOYEE_GRANTS });
    const peer = await t.factories.user({ unit: org.unitA, grants: TASK_EMPLOYEE_GRANTS });
    const stranger = await t.factories.user({ unit: org.unitC, grants: TASK_EMPLOYEE_GRANTS });
    const foreign = await t.factories.user({ unit: org.unitOther, grants: TASK_EMPLOYEE_GRANTS });
    await t.db.query('UPDATE employees SET manager_id = $1 WHERE id = ANY($2)', [manager.employeeId, [owner.employeeId]]);
    const agents = { manager: await t.factories.signIn(manager), owner: await t.factories.signIn(owner), peer: await t.factories.signIn(peer), stranger: await t.factories.signIn(stranger) };
    const task = (await agents.owner.post('/api/tasks').send({ title: 'مهمة بمتابعين' }).expect(201)).body as TaskDto;
    return { org, manager, owner, peer, stranger, foreign, agents, task };
  }
  const titles = async (agent: TestAgent) => ((await agent.get('/api/notifications').expect(200)).body.items as { titleEn: string }[]).map((n) => n.titleEn);

  it('lets the assignee add a colleague: they are told, they see the task and follow it, and the assignee can remove them', async () => {
    const w = await world();
    expect(w.task.abilities.manageFollowers).toBe(true);
    const added = (await w.agents.owner.post(`/api/tasks/${w.task.id}/followers`).send({ userIds: [w.peer.id] }).expect(200)).body as TaskFollowerDto[];
    expect(added.map((f) => f.userId)).toEqual([w.peer.id]);
    await vi.waitFor(async () => expect(await titles(w.agents.peer)).toContain('You now follow ' + (await w.agents.peer.get(`/api/tasks/${w.task.id}`).expect(200)).body.number));
    const seen = (await w.agents.peer.get(`/api/tasks/${w.task.id}`).expect(200)).body as TaskDto;
    expect(seen.isFollowing).toBe(true);
    expect((await w.agents.peer.get('/api/tasks').query({ tab: 'following' }).expect(200)).body.items.map((i: { id: string }) => i.id)).toContain(w.task.id);
    expect(((await w.agents.owner.get(`/api/tasks/${w.task.id}/followers`).expect(200)).body as TaskFollowerDto[]).length).toBe(1);
    const left = (await w.agents.owner.delete(`/api/tasks/${w.task.id}/followers/${w.peer.id}`).expect(200)).body as TaskFollowerDto[];
    expect(left).toEqual([]);
    await w.agents.peer.get(`/api/tasks/${w.task.id}`).expect(404);
  });

  it('adding the same person again changes nothing and tells them once', async () => {
    const w = await world();
    for (let i = 0; i < 2; i += 1) await w.agents.owner.post(`/api/tasks/${w.task.id}/followers`).send({ userIds: [w.peer.id] }).expect(200);
    await vi.waitFor(async () => expect((await titles(w.agents.peer)).filter((x) => x === 'Added as a follower' || x.startsWith('You now follow')).length).toBe(1));
    expect(((await w.agents.owner.get(`/api/tasks/${w.task.id}/followers`).expect(200)).body as TaskFollowerDto[]).length).toBe(1);
  });

  it('lets a manager whose scope reaches the assignee add followers to a task of their team', async () => {
    const w = await world();
    await w.agents.manager.post(`/api/tasks/${w.task.id}/followers`).send({ userIds: [w.peer.id] }).expect(200);
    expect(((await w.agents.peer.get(`/api/tasks/${w.task.id}`).expect(200)).body as TaskDto).isFollowing).toBe(true);
  });

  it('offers as candidates the colleagues of the company, not the assignee nor those who already follow, narrowed by the search', async () => {
    const w = await world();
    const all = (await w.agents.owner.get(`/api/tasks/${w.task.id}/followers/candidates`).expect(200)).body as TaskFollowerDto[];
    expect(all.map((p) => p.userId)).toContain(w.peer.id);
    expect(all.map((p) => p.userId)).not.toContain(w.owner.id);
    expect(all.map((p) => p.userId)).not.toContain(w.foreign.id);
    await w.agents.owner.post(`/api/tasks/${w.task.id}/followers`).send({ userIds: [w.peer.id] }).expect(200);
    expect(((await w.agents.owner.get(`/api/tasks/${w.task.id}/followers/candidates`).expect(200)).body as TaskFollowerDto[]).map((p) => p.userId)).not.toContain(w.peer.id);
  });

  it('validates: nobody picked, too many, a person of another company, a person who does not exist', async () => {
    const w = await world();
    const url = `/api/tasks/${w.task.id}/followers`;
    await w.agents.owner.post(url).send({ userIds: [] }).expect(400);
    await w.agents.owner.post(url).send({ userIds: Array.from({ length: 21 }, () => w.peer.id) }).expect(400);
    expect((await w.agents.owner.post(url).send({ userIds: [w.foreign.id] }).expect(422)).body.code).toBe('TASK_FOLLOWER_INVALID');
    expect((await w.agents.owner.post(url).send({ userIds: ['11111111-1111-4111-8111-111111111111'] }).expect(422)).body.code).toBe('TASK_FOLLOWER_INVALID');
  });

  it('403 for someone who sees the task but may not manage its followers, 403 without the key, 404 for a stranger', async () => {
    const w = await world();
    await w.agents.owner.post(`/api/tasks/${w.task.id}/followers`).send({ userIds: [w.peer.id] }).expect(200);
    await w.agents.peer.post(`/api/tasks/${w.task.id}/followers`).send({ userIds: [w.stranger.id] }).expect(403);
    await w.agents.peer.delete(`/api/tasks/${w.task.id}/followers/${w.peer.id}`).expect(403);
    expect(((await w.agents.peer.get(`/api/tasks/${w.task.id}`).expect(200)).body as TaskDto).abilities.manageFollowers).toBe(false);
    await w.agents.stranger.post(`/api/tasks/${w.task.id}/followers`).send({ userIds: [w.peer.id] }).expect(404);
    const bare = await t.factories.user({ unit: w.org.unitA, grants: TASK_EMPLOYEE_GRANTS, without: ['tasks.followers_manage'] });
    const bareAgent = await t.factories.signIn(bare);
    const mine = (await bareAgent.post('/api/tasks').send({ title: 'بلا مفتاح' }).expect(201)).body as TaskDto;
    await bareAgent.post(`/api/tasks/${mine.id}/followers`).send({ userIds: [w.peer.id] }).expect(403);
  });

  it('a follower stops following by themselves', async () => {
    const w = await world();
    await w.agents.owner.post(`/api/tasks/${w.task.id}/followers`).send({ userIds: [w.peer.id] }).expect(200);
    await w.agents.peer.delete(`/api/tasks/${w.task.id}/follow`).expect(200);
    await w.agents.peer.get(`/api/tasks/${w.task.id}`).expect(404);
  });
});
