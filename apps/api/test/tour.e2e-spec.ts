import { CorePermission, TOUR_STEPS, stepsOf } from '@arweqah-platform/shared';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { UserAccessService } from '../src/core/access/application/user-access.service';
import { ADMIN_MODE_GRANT } from './factories/factories';
import { useTestApp } from './setup/test-app';

const grant = (key: string) => ({ key, scope: 'all' as const });
const MANAGER = [ADMIN_MODE_GRANT, ...[CorePermission.TourSettingsView, CorePermission.TourSettingsEdit, CorePermission.TourSettingsReorder, CorePermission.TourSettingsReset].map(grant)];
const GENERAL = stepsOf('general').map((s) => s.key as string);

describe('Welcome tour (FR-67)', () => {
  const t = useTestApp();
  const manager = async () => t.factories.signInAdminMode(await t.factories.user({ grants: MANAGER }));
  const keys = (body: { steps: { key: string }[] }) => body.steps.map((s) => s.key);

  describe('a person’s own tour', () => {
    it('starts as «none», lists only the steps their permissions allow (an Employee holds tickets, tasks and the structure), and remembers finishing in their account', async () => {
      const agent = await t.factories.signIn(await t.factories.user());
      const first = (await agent.get('/api/me/tour/general').expect(200)).body;
      expect(first).toMatchObject({ tour: 'general', status: 'none', newSteps: [] });
      expect(keys(first)).toEqual(['welcome', 'account-menu', 'profile', 'security', 'my-access', 'sign-out', 'language-theme', 'notifications', 'sidebar', 'home', 'tickets', 'ticket-new', 'ticket-views', 'tasks', 'task-new', 'task-views', 'task-open', 'employees', 'org', 'org-views', 'finish']);

      expect((await agent.post('/api/me/tour/general/complete').expect(200)).body.status).toBe('completed');
      expect((await agent.get('/api/me/tour/general').expect(200)).body).toMatchObject({ status: 'completed', newSteps: [] });
    });

    it('adds the steps of the pages the person may open, in the code’s order', async () => {
      const agent = await t.factories.signIn(await t.factories.user({ grants: [grant(CorePermission.TicketsView), grant(CorePermission.TasksView), grant(CorePermission.TasksCreate)] }));
      const list = keys((await agent.get('/api/me/tour/general').expect(200)).body);
      expect(list).toEqual(expect.arrayContaining(['tickets', 'tasks', 'task-new']));
      expect(list.indexOf('home')).toBeLessThan(list.indexOf('tickets'));
      expect(list.indexOf('tasks')).toBeLessThan(list.indexOf('task-new'));
      expect(list.at(-1)).toBe('finish');
    });

    it('drops a step whose page an administrator hid from every role of the person', async () => {
      const admin = await t.factories.signInAdminMode(await t.factories.user({ grants: [...MANAGER, grant(CorePermission.PagesView), grant(CorePermission.PagesManage), grant(CorePermission.RolesView)] }));
      const role = await t.factories.role([grant(CorePermission.TicketsView)]);
      const user = await t.factories.user();
      await t.app.get(UserAccessService).replaceRoles(user.id, [role.id]);
      const agent = await t.factories.signIn(user);
      expect(keys((await agent.get('/api/me/tour/general').expect(200)).body)).toContain('tickets');
      await admin.put(`/api/page-visibility/roles/${role.id}`).send({ hiddenPages: ['tickets'] }).expect(200);
      expect(keys((await agent.get('/api/me/tour/general').expect(200)).body)).not.toContain('tickets');
    });

    it('skipping is remembered too, and restarting forgets it', async () => {
      const agent = await t.factories.signIn(await t.factories.user());
      await agent.post('/api/me/tour/general/skip').expect(200);
      expect((await agent.get('/api/me/tour/general').expect(200)).body.status).toBe('skipped');
      expect((await agent.post('/api/me/tour/general/restart').expect(200)).body.status).toBe('none');
    });

    it('offers a person who finished only the steps that appeared since (the «what’s new» tour)', async () => {
      const user = await t.factories.user();
      const agent = await t.factories.signIn(user);
      await agent.post('/api/me/tour/general/complete').expect(200);
      await t.db.query(`UPDATE user_tour_progress SET seen_steps = array_remove(seen_steps, 'home') WHERE user_id = $1`, [user.id]);
      expect((await agent.get('/api/me/tour/general').expect(200)).body.newSteps).toEqual(['home']);
    });

    it('keeps each person’s progress to themselves', async () => {
      const a = await t.factories.signIn(await t.factories.user());
      const b = await t.factories.signIn(await t.factories.user());
      await a.post('/api/me/tour/general/complete').expect(200);
      expect((await b.get('/api/me/tour/general').expect(200)).body.status).toBe('none');
    });

    it('answers 404 for the administration tour to anyone who may not use admin mode, and works for who may', async () => {
      const plain = await t.factories.signIn(await t.factories.user());
      await plain.get('/api/me/tour/admin').expect(404);
      await plain.post('/api/me/tour/admin/complete').expect(404);
      const admin = await t.factories.signIn(await t.factories.user({ grants: [ADMIN_MODE_GRANT] }));
      const body = (await admin.get('/api/me/tour/admin').expect(200)).body;
      expect(keys(body)).toEqual(['admin-mode']);
    });

    it('shows the exceptions step only to who may see the exceptions page (FR-70, FR-67)', async () => {
      const withKey = await t.factories.signInAdminMode(await t.factories.user({ grants: [ADMIN_MODE_GRANT, grant(CorePermission.ExceptionsView)] }));
      expect(keys((await withKey.get('/api/me/tour/admin').expect(200)).body)).toEqual(['admin-mode', 'exceptions']);
      const without = await t.factories.signInAdminMode(await t.factories.user({ grants: [ADMIN_MODE_GRANT, grant(CorePermission.RolesView)] }));
      expect(keys((await without.get('/api/me/tour/admin').expect(200)).body)).not.toContain('exceptions');
    });

    it('refuses an unknown tour (400) and a visitor who is not signed in (401)', async () => {
      const agent = await t.factories.signIn(await t.factories.user());
      await agent.get('/api/me/tour/nowhere').expect(400);
      await request(t.app.getHttpServer()).get('/api/me/tour/general').expect(401);
    });
  });

  describe('settings', () => {
    it('lists every step of both tours with its place, and edits wording, the switch and the order', async () => {
      const admin = await manager();
      const list = (await admin.get('/api/tour-steps').expect(200)).body;
      expect(keys(list)).toEqual(expect.arrayContaining(TOUR_STEPS.map((s) => s.key)));
      expect(list.steps.every((s: { customised: boolean }) => !s.customised)).toBe(true);

      const edited = (await admin.put('/api/tour-steps/home').send({ enabled: true, titleAr: 'مرحبًا بالرئيسية', titleEn: 'Home', bodyAr: null, bodyEn: '  ' }).expect(200)).body;
      expect(edited).toMatchObject({ key: 'home', titleAr: 'مرحبًا بالرئيسية', titleEn: 'Home', bodyAr: null, bodyEn: null, customised: true });
      const user = await t.factories.signIn(await t.factories.user());
      expect((await user.get('/api/me/tour/general').expect(200)).body.steps.find((s: { key: string }) => s.key === 'home')).toMatchObject({ titleAr: 'مرحبًا بالرئيسية', titleEn: 'Home' });

      await admin.put('/api/tour-steps/home').send({ enabled: false, titleAr: null, titleEn: null, bodyAr: null, bodyEn: null }).expect(200);
      expect(keys((await user.get('/api/me/tour/general').expect(200)).body)).not.toContain('home');

      const reversed = [...GENERAL].reverse();
      const ordered = (await admin.put('/api/tour-steps/order').send({ tour: 'general', keys: reversed }).expect(200)).body;
      expect(ordered.steps.filter((s: { tour: string }) => s.tour === 'general').map((s: { key: string }) => s.key)).toEqual(reversed);
      expect(keys((await user.get('/api/me/tour/general').expect(200)).body)[0]).toBe('finish');

      const reset = (await admin.post('/api/tour-steps/home/reset').expect(200)).body;
      expect(reset).toMatchObject({ enabled: true, titleAr: null, customised: false });
    });

    it('refuses an order that lacks a step or repeats one (422), a text that is too long, unknown fields and an unknown step (400)', async () => {
      const admin = await manager();
      expect((await admin.put('/api/tour-steps/order').send({ tour: 'general', keys: GENERAL.slice(1) }).expect(422)).body.code).toBe('TOUR_ORDER_INVALID');
      await admin.put('/api/tour-steps/order').send({ tour: 'general', keys: [...GENERAL.slice(1), GENERAL[1]] }).expect(422);
      await admin.put('/api/tour-steps/order').send({ tour: 'general', keys: [...GENERAL.slice(1), 'admin-mode'] }).expect(422);
      const body = { enabled: true, titleAr: null, titleEn: null, bodyAr: null, bodyEn: null };
      await admin.put('/api/tour-steps/home').send({ ...body, titleEn: 'x'.repeat(81) }).expect(400);
      await admin.put('/api/tour-steps/home').send({ ...body, bodyEn: 'x'.repeat(401) }).expect(400);
      await admin.put('/api/tour-steps/home').send({ ...body, extra: 1 }).expect(400);
      await admin.put('/api/tour-steps/nowhere').send(body).expect(400);
    });

    it('needs the right key per action and admin mode (403)', async () => {
      const body = { enabled: true, titleAr: null, titleEn: null, bodyAr: null, bodyEn: null };
      const plain = await t.factories.signIn(await t.factories.user());
      await plain.get('/api/tour-steps').expect(403);
      await plain.put('/api/tour-steps/home').send(body).expect(403);

      const noMode = await t.factories.signIn(await t.factories.user({ grants: MANAGER }));
      expect((await noMode.get('/api/tour-steps').expect(403)).body.code).toBe('ADMIN_MODE_REQUIRED');

      const viewOnly = await t.factories.signInAdminMode(await t.factories.user({ grants: [ADMIN_MODE_GRANT, grant(CorePermission.TourSettingsView)] }));
      await viewOnly.get('/api/tour-steps').expect(200);
      await viewOnly.put('/api/tour-steps/home').send(body).expect(403);
      await viewOnly.put('/api/tour-steps/order').send({ tour: 'general', keys: GENERAL }).expect(403);
      await viewOnly.post('/api/tour-steps/home/reset').expect(403);
    });

    it('audits every change by step name, never the wording', async () => {
      const admin = await manager();
      await admin.put('/api/tour-steps/security').send({ enabled: true, titleAr: 'سري جدًا', titleEn: null, bodyAr: null, bodyEn: null }).expect(200);
      await admin.post('/api/tour-steps/security/reset').expect(200);
      await expect.poll(async () => (await t.db.query<{ action: string }[]>(`SELECT action FROM audit_logs WHERE entity_type = 'tour_step' AND entity_id = 'security' ORDER BY created_at`)).map((r) => r.action)).toEqual(['tour.step_edited', 'tour.step_reset']);
      const rows = await t.db.query<{ changes: unknown }[]>(`SELECT changes FROM audit_logs WHERE action = 'tour.step_edited' AND entity_id = 'security'`);
      expect(JSON.stringify(rows[0]?.changes)).not.toContain('سري');
    });
  });
});
