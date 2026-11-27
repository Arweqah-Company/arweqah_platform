import type { TicketDto } from '@arweqah-platform/shared';
import { TICKET_DESK_ADMIN_GRANTS, type TestAgent } from '../factories/factories';
import type { TestContext } from '../setup/test-app';
import { codeFor } from './totp';

const SETTINGS = { receptionStatus: 'active', descriptionAr: null, descriptionEn: null, acceptsPersonal: true, defaultDueDays: 3, minLeadDays: 0, autoCloseDays: 4, reopenWindowDays: 7, staleAfterDays: 14 };
const TYPE = { nameAr: 'مشكلة', nameEn: 'Problem', descriptionAr: null, descriptionEn: null, dueDays: null, isPersonal: false, isActive: true };

/**
 * A department with an open desk and one type handled by `assignee`, a ticket sent by `sender`, a colleague of another unit of the same
 * company, somebody of another company, and somebody whose role lacks every `tickets.comment` key.
 */
export async function ticketWorld(t: TestContext, options: { personal?: boolean; senderWithout?: string[] } = {}) {
  const org = await t.factories.org();
  const manager = await t.factories.user({ unit: org.unitA, grants: TICKET_DESK_ADMIN_GRANTS });
  const assignee = await t.factories.user({ unit: org.unitA });
  await t.db.query('UPDATE employees SET org_node_id = $1 WHERE id = $2', [org.department, assignee.employeeId]); // handlers sit directly in the desk
  const sender = await t.factories.user({ unit: org.unitB, without: options.senderWithout });
  const colleague = await t.factories.user({ unit: org.unitC });
  const otherCompany = await t.factories.user({ unit: org.unitOther });
  const noKeys = await t.factories.user({ unit: org.unitA, without: ['tickets.comment'] });

  await t.db.query('UPDATE org_nodes SET manager_id = $1 WHERE id = $2', [manager.employeeId, org.department]);
  const managerAgent = await t.factories.signIn(manager);
  await managerAgent.post('/api/admin-mode/activate').send({ code: codeFor(manager.secret, Date.now() + 30_000) }).expect(200);
  await managerAgent.put(`/api/tickets/setup/desks/${org.department}`).send(SETTINGS).expect(200);
  const typeId = (await managerAgent.post(`/api/tickets/setup/desks/${org.department}/types`).send({ ...TYPE, isPersonal: options.personal ?? false, handlerUserIds: [assignee.id] }).expect(201)).body.id as string;
  const agents: Record<string, TestAgent> = {
    assignee: await t.factories.signIn(assignee),
    sender: await t.factories.signIn(sender),
    colleague: await t.factories.signIn(colleague),
    noKeys: await t.factories.signIn(noKeys),
  };
  const ticket = (await agents.sender!.post('/api/tickets').send({ typeId, title: 'الطابعة', details: 'تفاصيل' }).expect(201)).body as TicketDto;
  return { assignee, sender, colleague, otherCompany, noKeys, agents: agents as Record<'assignee' | 'sender' | 'colleague' | 'noKeys', TestAgent>, ticket };
}
