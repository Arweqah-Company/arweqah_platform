import { CorePermission, type CompetencyStatusDto, type MyProgressDto, type PermissionGrant, type TeamMemberDetailDto } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { complete } from './helpers/career-content';
import { chainScenario } from './helpers/title-chain';
import { useTestApp } from './setup/test-app';

const HR = [CorePermission.CareerContentView, CorePermission.CareerContentEdit, CorePermission.CareerTitlefilePublish];
const grants = (keys: string[], scope: 'all' | 'unit' = 'all'): PermissionGrant[] => keys.map((key) => ({ key, scope }));
const TEAM = [CorePermission.CareerTeamView, CorePermission.CareerCompetencyRecord];

describe('Competency levels and the budget card (FR-117)', () => {
  const t = useTestApp();

  async function setup(published = true) {
    const s = await chainScenario(t);
    const hr = await t.factories.signIn(await t.factories.user({ grants: grants(HR) }));
    const holder = await s.person(s.rep, s.group);
    const me = await t.factories.signIn(holder);
    const boss = await t.factories.signIn(await t.factories.user({ grants: grants(TEAM) }));
    await hr.put(`/api/career/titles/${s.rep.id}/content`).send({ content: complete }).expect(200);
    if (published) await hr.post(`/api/career/titles/${s.rep.id}/publish`).expect(200);
    const record = (body: object, agent = boss) => agent.put(`/api/career/team/${holder.employeeId}/competencies`).send(body);
    const mine = async () => (await me.get('/api/career-profile/me/progress').expect(200)).body as MyProgressDto;
    return { ...s, hr, holder, me, boss, record, mine };
  }

  it('shows the competencies of the title the employee must reach, unmet until the manager records a level', async () => {
    const s = await setup();
    expect((await s.mine()).competencies).toEqual([{ name: 'الاتصال المباشر', required: 'أساسي', mine: null, met: false }]);
  });

  it('records the level a manager says the employee reached: the employee and the manager see it, and a level at or above the required one is met', async () => {
    const s = await setup();
    const saved = (await s.record({ competency: 'الاتصال المباشر', level: 'أساسي' }).expect(200)).body as CompetencyStatusDto[];
    expect(saved).toEqual([{ name: 'الاتصال المباشر', required: 'أساسي', mine: 'أساسي', met: true }]);
    expect((await s.mine()).competencies[0]).toMatchObject({ mine: 'أساسي', met: true });
    const detail = (await s.boss.get(`/api/career/team/${s.holder.employeeId}`).expect(200)).body as TeamMemberDetailDto;
    expect(detail.competencies[0]).toMatchObject({ name: 'الاتصال المباشر', mine: 'أساسي', met: true });
    await s.record({ competency: 'الاتصال المباشر', level: 'خبير' }).expect(200);
    expect((await s.mine()).competencies[0]).toMatchObject({ mine: 'خبير', met: true });
  });

  it('takes a record back with a null level and keeps one row per employee and competency', async () => {
    const s = await setup();
    await s.record({ competency: 'الاتصال المباشر', level: 'أساسي' }).expect(200);
    await s.record({ competency: 'الاتصال المباشر', level: 'خبير' }).expect(200);
    expect(((await t.db.query('SELECT count(*)::int AS n FROM career_employee_competency_levels WHERE employee_id = $1', [s.holder.employeeId])) as { n: number }[])[0]?.n).toBe(1);
    await s.record({ competency: 'الاتصال المباشر', level: null }).expect(200);
    expect((await s.mine()).competencies[0]).toMatchObject({ mine: null, met: false });
  });

  it('refuses a competency the title does not ask for (404), a level that is not one (400), unknown fields (400), and a person with no ready path (404)', async () => {
    const s = await setup();
    await s.record({ competency: 'غير موجودة', level: 'أساسي' }).expect(404);
    await s.record({ competency: 'الاتصال المباشر', level: 'مبتدئ' }).expect(400);
    await s.record({ competency: 'الاتصال المباشر', level: 'أساسي', extra: 1 }).expect(400);
    await s.record({ level: 'أساسي' }).expect(400);
    const draft = await setup(false);
    await draft.record({ competency: 'الاتصال المباشر', level: 'أساسي' }).expect(404);
  });

  it('lets only people with the key and the scope record: no key is 403, a person outside the scope is 404, and the employee cannot record their own', async () => {
    const s = await setup();
    const noKey = await t.factories.signIn(await t.factories.user({ grants: grants([CorePermission.CareerTeamView]) }));
    await s.record({ competency: 'الاتصال المباشر', level: 'أساسي' }, noKey).expect(403);
    const narrow = await t.factories.signIn(await t.factories.user({ grants: grants(TEAM, 'unit') }));
    await s.record({ competency: 'الاتصال المباشر', level: 'أساسي' }, narrow).expect(404);
    await s.record({ competency: 'الاتصال المباشر', level: 'أساسي' }, s.me).expect(403);
  });

  it('shows the budget card: the cap of the stage (a Rep grade 7 P is in the specialization stage: 5,000) and what was approved this year', async () => {
    const s = await setup();
    expect((await s.mine()).budget).toEqual({ cap: 5000, spent: 0 });
    await t.db.query(
      `INSERT INTO career_development_requests (employee_id, course_name, cost, plan, status, level, approver_user_id, budget_cap, decided_at, submitted_at) VALUES ($1, 'دورة', 1800, 'in', 'approved', 'direct', NULL, 5000, now(), now())`,
      [s.holder.employeeId],
    );
    await t.db.query(
      `INSERT INTO career_development_requests (employee_id, course_name, cost, plan, status, level, approver_user_id, budget_cap, decided_at, submitted_at) VALUES ($1, 'دورة قديمة', 900, 'in', 'approved', 'direct', NULL, 5000, now() - interval '2 years', now() - interval '2 years')`,
      [s.holder.employeeId],
    );
    await t.db.query(
      `INSERT INTO career_development_requests (employee_id, course_name, cost, plan, status, level, approver_user_id, budget_cap, submitted_at) VALUES ($1, 'معلّقة', 700, 'in', 'pending', 'direct', NULL, 5000, now())`,
      [s.holder.employeeId],
    );
    expect((await s.mine()).budget).toEqual({ cap: 5000, spent: 1800 });
  });
});
