import { AGENT_IMAGE_MAX_BYTES, CorePermission, type AgentReplyDto, type FileDto, type PermissionGrant } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { TICKET_DESK_ADMIN_GRANTS } from './factories/factories';
import { switchAiOn } from './helpers/ai-on';
import { useTestApp } from './setup/test-app';

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const PDF = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
const AGENT_KEYS: PermissionGrant[] = [CorePermission.AgentView, CorePermission.AgentUse, CorePermission.AgentHistoryView, CorePermission.AgentAttachImage].map((key) => ({ key, scope: 'all' as const }));
const WITHOUT_ATTACH = AGENT_KEYS.filter((g) => g.key !== CorePermission.AgentAttachImage);
const SETTINGS = { receptionStatus: 'active', descriptionAr: 'نصيحة', descriptionEn: 'Tip', acceptsPersonal: false, defaultDueDays: 3, minLeadDays: 0, autoCloseDays: 4, reopenWindowDays: 7, staleAfterDays: 5 };
const TYPE = { nameAr: 'مشكلة تقنية', nameEn: 'Technical problem', descriptionAr: null, descriptionEn: null, dueDays: null, isPersonal: false, isActive: true };
const CREATE_TICKET = 'TicketsController.create';
const CATALOG = 'TicketsController.catalogOf';

const step = (over: Record<string, unknown>) => ({ kind: 'say', text: '', operationId: '', valuesJson: '{}', summary: '', ...over });
const answers = (t: { ai: { answer: (what: unknown) => void } }, ...steps: unknown[]) => t.ai.answer({ steps });

describe('Pictures in the assistant chat (FR-180)', () => {
  const t = useTestApp();

  /** A sender with the assistant's keys (and the picture key unless asked), a desk with one ticket type, and a stranger with the keys too. */
  async function world(grants: PermissionGrant[] = AGENT_KEYS) {
    await switchAiOn(t);
    const org = await t.factories.org();
    const manager = await t.factories.user({ unit: org.unitA, grants: TICKET_DESK_ADMIN_GRANTS });
    const handler = await t.factories.user({ unit: org.unitA });
    await t.db.query('UPDATE employees SET org_node_id = $1 WHERE id = $2', [org.department, handler.employeeId]);
    await t.db.query('UPDATE org_nodes SET manager_id = $1 WHERE id = $2', [manager.employeeId, org.department]);
    const boss = await t.factories.signIn(manager);
    await boss.put(`/api/tickets/setup/desks/${org.department}`).send(SETTINGS).expect(200);
    const typeId = (await boss.post(`/api/tickets/setup/desks/${org.department}/types`).send({ ...TYPE, handlerUserIds: [handler.id] }).expect(201)).body.id as string;
    const sender = await t.factories.user({ unit: org.unitB, grants: [{ key: CorePermission.TicketsCreate, scope: 'all' }, ...grants] });
    const stranger = await t.factories.user({ unit: org.unitC, grants: AGENT_KEYS });
    return { sender, agent: await t.factories.signIn(sender), stranger: await t.factories.signIn(stranger), typeId };
  }

  /** The Employee role holds the key by default (the migration): taking it away leaves a person who has only what they were given. */
  const dropAttachKey = () => t.db.query(`DELETE FROM role_permissions WHERE permission_key = 'agent.attach_image'`);

  type World = Awaited<ReturnType<typeof world>>;
  const upload = async (agent: World['agent'], content: Buffer = PNG, name = 'screen.png') => (await agent.post('/api/agent/files').attach('file', content, name).expect(201)).body as FileDto;
  const talk = async (agent: World['agent'], body: Record<string, unknown>, status = 201): Promise<AgentReplyDto> => (await agent.post('/api/agent/messages').send(body).expect(status)).body;

  describe('uploading', () => {
    it('FR-180: a PNG of the right size is stored for its uploader only', async () => {
      const w = await world();
      const file = await upload(w.agent);
      expect(file).toMatchObject({ originalName: 'screen.png', contentType: 'image/png', size: PNG.length });
      expect((await t.db.query('SELECT owner_id FROM files WHERE id = $1', [file.id]))[0].owner_id).toBe(w.sender.id);
    });

    it('FR-180: a file that is not a PNG or a JPEG is refused, whatever its name says', async () => {
      const w = await world();
      await w.agent.post('/api/agent/files').attach('file', PDF, 'screen.png').expect(422).expect((r) => expect(r.body.code).toBe('FILE_TYPE_NOT_ALLOWED'));
      await w.agent.post('/api/agent/files').attach('file', Buffer.from('GIF89a'), 'a.gif').expect(422);
    });

    it('FR-180: a picture over the limit is refused', async () => {
      const w = await world();
      const big = Buffer.concat([PNG, Buffer.alloc(AGENT_IMAGE_MAX_BYTES)]);
      await w.agent.post('/api/agent/files').attach('file', big, 'big.png').expect((r) => expect([413, 422]).toContain(r.status));
    });

    it('FR-180: without agent.attach_image the upload is 403', async () => {
      const w = await world(WITHOUT_ATTACH);
      await dropAttachKey();
      await w.agent.post('/api/agent/files').attach('file', PNG, 'screen.png').expect(403);
    });
  });

  describe('sending', () => {
    it('FR-180: the picture goes to the AI service with the message, and the model is told how many came', async () => {
      const w = await world();
      const file = await upload(w.agent);
      answers(t, step({ kind: 'say', text: 'I can see the error.' }));
      const reply = await talk(w.agent, { text: 'what is this?', fileIds: [file.id] });
      expect(t.ai.calls[0]!.images).toEqual([{ mediaType: 'image/png', data: PNG.toString('base64') }]);
      expect(t.ai.calls[0]!.user).toContain('[1 picture attached]');
      const saved = (await w.agent.get(`/api/agent/conversations/${reply.conversationId}`).expect(200)).body;
      expect(saved.messages[0]).toMatchObject({ role: 'user', text: 'what is this?', files: [{ id: file.id, name: 'screen.png', contentType: 'image/png' }] });
    });

    it('FR-180: a picture alone is a message (the conversation is titled «Picture»), and neither text nor picture is a 400', async () => {
      const w = await world();
      const file = await upload(w.agent);
      answers(t, step({ kind: 'say', text: 'ok' }));
      const reply = await talk(w.agent, { text: '', fileIds: [file.id] });
      expect((await w.agent.get('/api/agent/conversations').expect(200)).body[0]).toMatchObject({ id: reply.conversationId, title: expect.stringMatching(/Picture|صورة/) });
      await w.agent.post('/api/agent/messages').send({ text: '   ' }).expect(400);
    });

    it('FR-180: more than three pictures is a 400', async () => {
      const w = await world();
      const ids = [(await upload(w.agent)).id, (await upload(w.agent)).id, (await upload(w.agent)).id, (await upload(w.agent)).id];
      await w.agent.post('/api/agent/messages').send({ text: 'x', fileIds: ids }).expect(400);
    });

    it('FR-180: sending pictures needs the key (403), and a stranger\'s picture or one already sent is 404', async () => {
      const w = await world();
      const mine = await upload(w.agent);
      const theirs = await upload(w.stranger);
      await w.agent.post('/api/agent/messages').send({ text: 'x', fileIds: [theirs.id] }).expect(404);
      answers(t, step({ kind: 'say', text: 'ok' }));
      await talk(w.agent, { text: 'first', fileIds: [mine.id] });
      await w.agent.post('/api/agent/messages').send({ text: 'again', fileIds: [mine.id] }).expect(404);
      const keyless = await world(WITHOUT_ATTACH);
      await dropAttachKey();
      await keyless.agent.post('/api/agent/messages').send({ text: 'x', fileIds: [mine.id] }).expect(403);
    });

    it('FR-180: a service that cannot read pictures is asked again without them, and the model is told it saw nothing', async () => {
      const w = await world();
      const file = await upload(w.agent);
      t.ai.fail({ kind: 'failed', message: '400: image input is not supported', imagesRejected: true });
      answers(t, step({ kind: 'say', text: 'Please describe the problem in words.' }));
      const reply = await talk(w.agent, { text: 'see the screen', fileIds: [file.id] });
      expect(t.ai.calls).toHaveLength(2);
      expect(t.ai.calls[0]!.images).toHaveLength(1);
      expect(t.ai.calls[1]!.images).toBeUndefined();
      expect(t.ai.calls[1]!.user).toContain('cannot read pictures');
      expect(reply.messages[0]!.text).toContain('describe');
    });

    it('FR-180: the pictures of the newest message that has them stay in view while the model works out a request, even after later messages without pictures', async () => {
      const w = await world();
      const file = await upload(w.agent);
      answers(t, step({ kind: 'say', text: 'Which type?' }));
      const first = await talk(w.agent, { text: 'there is an error', fileIds: [file.id] });
      answers(t, step({ kind: 'say', text: 'noted' }));
      await talk(w.agent, { text: 'the technical type', conversationId: first.conversationId });
      expect(t.ai.calls.at(-1)!.images).toHaveLength(1);
    });
  });

  describe('reading', () => {
    it('FR-180: only the owner of the conversation reads the picture; anyone else gets 404', async () => {
      const w = await world();
      const file = await upload(w.agent);
      answers(t, step({ kind: 'say', text: 'ok' }));
      await talk(w.agent, { text: 'x', fileIds: [file.id] });
      const seen = await w.agent.get(`/api/agent/files/${file.id}/preview`).expect(200);
      expect(seen.headers['content-type']).toContain('image/png');
      expect(seen.headers['cache-control']).toContain('no-store');
      await w.stranger.get(`/api/agent/files/${file.id}/preview`).expect(404);
      await w.stranger.get(`/api/agent/files/${file.id}/content`).expect(404);
      await w.agent.get(`/api/agent/files/${(await upload(w.agent)).id}/preview`).expect(404); // uploaded, never sent
    });
  });

  describe('with a ticket', () => {
    /** The model looks the types up and proposes a ticket; the model itself writes a fileIds field, which is dropped. */
    async function ticketDraft(w: World, fileIds: string[]) {
      answers(t, step({ kind: 'describe', operationId: CREATE_TICKET }), step({ kind: 'find', operationId: CATALOG }));
      answers(t, step({ kind: 'propose', operationId: CREATE_TICKET, valuesJson: JSON.stringify({ typeId: w.typeId, title: 'Error on the payroll page', details: 'The screen shows an error', fileIds: ['11111111-1111-4111-8111-111111111111'] }), summary: 'Open a ticket about the error' }));
      const reply = await talk(w.agent, { text: 'open a ticket about this error', fileIds });
      return reply.messages[0]!.draft!;
    }

    it('FR-180: the card offers the conversation\'s pictures, ticking them attaches them to the ticket, and the model never chose the ids', async () => {
      const w = await world();
      const file = await upload(w.agent);
      const draft = await ticketDraft(w, [file.id]);
      expect(draft.files).toEqual([expect.objectContaining({ id: file.id, name: 'screen.png' })]);
      expect(draft.values).not.toHaveProperty('fileIds');
      const done = (await w.agent.post(`/api/agent/drafts/${draft.id}/confirm`).send({ fileIds: [file.id] }).expect(201)).body as AgentReplyDto;
      expect(done.messages[0]!.draft).toMatchObject({ status: 'confirmed', result: { ok: true } });
      const ticket = (await t.db.query('SELECT id FROM tickets'))[0].id as string;
      const attached = await t.db.query('SELECT file_id FROM ticket_attachments WHERE file_id = $1', [file.id]);
      expect(attached).toHaveLength(1);
      expect(ticket).toBeTruthy();
      const audit = (await t.db.query(`SELECT changes FROM audit_logs WHERE action = 'agent.action_executed'`)) as { changes: { files: number } }[];
      expect(audit[0]?.changes.files).toBe(1);
    });

    it('FR-152: the ticket form offers the priority as a list (normal / urgent), not a number box; the form button exists, and the choice reaches the ticket as a number', async () => {
      const w = await world();
      const sayWith = (text: string, extra: Record<string, unknown>) => step({ kind: 'say', text, ...extra });
      answers(t, step({ kind: 'describe', operationId: CREATE_TICKET }), step({ kind: 'find', operationId: CATALOG }), step({ kind: 'say', text: 'Give me the title; press the form button.' }));
      answers(t, step({ kind: 'propose', operationId: CREATE_TICKET, valuesJson: JSON.stringify({ typeId: w.typeId }), summary: 'Open a ticket' }));
      answers(t, sayWith('I need a title.', { optionsJson: JSON.stringify({ typeId: [{ label: 'مشكلة تقنية', value: w.typeId }] }), labelsJson: JSON.stringify({ priority: 'الأولوية', title: 'العنوان', typeId: 'النوع' }) }));
      const reply = await talk(w.agent, { text: 'عايزة اعمل تذكرة' });
      const form = reply.messages[0]!.form!;
      expect(form).toMatchObject({ operationId: CREATE_TICKET, status: 'open' });
      expect(form.fields.find((f) => f.name === 'priority')).toMatchObject({ type: 'select', numeric: true, label: 'الأولوية', options: [{ label: 'عادية', value: '0' }, { label: 'عاجلة', value: '1' }] });
      const sent = (await w.agent.post(`/api/agent/forms/${reply.messages[0]!.id}/submit`).send({ values: { typeId: w.typeId, title: 'لا تفتح صفحة مهامي', priority: '1' } }).expect(201)).body as AgentReplyDto;
      const draft = sent.messages[1]!.draft!;
      expect(draft.values).toMatchObject({ priority: 1 });
      await w.agent.post(`/api/agent/drafts/${draft.id}/confirm`).send({ fileIds: [] }).expect(201);
      expect((await t.db.query('SELECT priority FROM tickets'))[0].priority).toBe(1);
    });

    it('FR-180: leaving the picture unticked makes the ticket without it', async () => {
      const w = await world();
      const file = await upload(w.agent);
      const draft = await ticketDraft(w, [file.id]);
      await w.agent.post(`/api/agent/drafts/${draft.id}/confirm`).send({ fileIds: [] }).expect(201);
      expect(await t.db.query('SELECT 1 FROM tickets')).toHaveLength(1);
      expect(await t.db.query('SELECT 1 FROM ticket_attachments')).toHaveLength(0);
    });

    it('FR-180: a picture the card did not offer is refused (422) and nothing runs', async () => {
      const w = await world();
      const file = await upload(w.agent);
      const other = await upload(w.agent);
      const draft = await ticketDraft(w, [file.id]);
      await w.agent.post(`/api/agent/drafts/${draft.id}/confirm`).send({ fileIds: [other.id] }).expect(422).expect((r) => expect(r.body.code).toBe('AGENT_DRAFT_FILE'));
      expect(await t.db.query('SELECT 1 FROM tickets')).toHaveLength(0);
      await w.agent.post(`/api/agent/drafts/${draft.id}/confirm`).send({ fileIds: [file.id], extra: 1 }).expect(400);
    });

    it('FR-180: a draft of an action that takes no files offers none', async () => {
      const w = await world();
      const file = await upload(w.agent);
      answers(t, step({ kind: 'say', text: 'ok' }));
      const first = await talk(w.agent, { text: 'x', fileIds: [file.id] });
      expect(first.messages[0]!.draft).toBeNull();
    });
  });
});
