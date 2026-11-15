import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppConfig } from '../../config/app-config.service';

interface DemoType {
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  isPersonal?: boolean;
}

interface SampleTicket {
  title: string;
  details: string;
  status: 'open' | 'close_requested' | 'closed';
  reason?: 'confirmed' | 'auto' | 'not_executed';
  ageDays: number;
  dueInDays: number;
  urgent?: boolean;
  personal?: boolean;
  answered?: boolean;
  quietDays?: number;
}

const SAMPLE_TICKETS: SampleTicket[] = [
  { title: 'الطابعة في الطابق الثاني لا تعمل', details: 'تظهر رسالة خطأ عند الطباعة.', status: 'open', ageDays: 1, dueInDays: 2, urgent: true },
  { title: 'لا أستطيع الدخول إلى المنصة', details: 'يرفض النظام رمز المصادقة.', status: 'open', ageDays: 6, dueInDays: -1, answered: true },
  { title: 'طلب برنامج تصميم', details: 'أحتاج ترخيصًا لبرنامج التصميم.', status: 'close_requested', ageDays: 3, dueInDays: 1, answered: true },
  { title: 'تحديث بيانات الحاسب', details: 'تم الطلب منذ أسبوعين.', status: 'closed', reason: 'confirmed', ageDays: 10, dueInDays: -6 },
  { title: 'استفسار عن دعم مشروع', details: 'لم يصل رد فأُغلقت تلقائيًا.', status: 'closed', reason: 'auto', ageDays: 8, dueInDays: -4 },
  { title: 'ملاحظة خاصة', details: 'موضوع شخصي لا يراه مدير الإدارة.', status: 'open', ageDays: 2, dueInDays: 3, personal: true },
];

/** Each demo department takes these kinds of ticket (development only; real departments are set up by their managers). */
const DEMO_DESKS: { departmentAr: string; acceptsPersonal: boolean; types: DemoType[] }[] = [
  {
    departmentAr: 'إدارة الخدمات المشتركة',
    acceptsPersonal: false,
    types: [
      { nameAr: 'مشكلة في المنصة', nameEn: 'Platform problem', descriptionAr: 'مشاكل أو أخطاء في منصة أروقة الريادة', descriptionEn: 'Problems or errors in the Arweqah platform' },
      { nameAr: 'مشكلة تقنية', nameEn: 'Technical problem', descriptionAr: 'مشاكل في أجهزة الموظف', descriptionEn: "Problems with the employee's devices" },
    ],
  },
  {
    departmentAr: 'إدارة المشاريع',
    acceptsPersonal: true,
    types: [
      { nameAr: 'طلب دعم مشروع', nameEn: 'Project support request', descriptionAr: 'طلب دعم أو متابعة لمشروع', descriptionEn: 'Asking for support or follow-up on a project' },
      { nameAr: 'شكوى', nameEn: 'Complaint', descriptionAr: 'شكاوى الموظفين', descriptionEn: 'Employee complaints', isPersonal: true },
    ],
  },
];

/**
 * Development only (SEED_DEMO_ORG): turns the sample departments into working ticket desks with the example types of the owner's
 * description, with the first administrator as their manager and assignee, so the module can be tried at once. Idempotent.
 */
@Injectable()
export class TicketsDemoSeeder {
  private readonly logger = new Logger('Seed');

  constructor(
    private readonly db: DataSource,
    private readonly config: AppConfig,
  ) {}

  async run(adminUserId: string | null): Promise<void> {
    if (!this.config.get('SEED_DEMO_ORG') || !adminUserId) return;
    const admin = await this.db.query<{ id: string; company_id: string }[]>('SELECT id, company_id FROM employees WHERE user_id = $1 AND deleted_at IS NULL', [adminUserId]);
    if (!admin[0]) return;
    for (const demo of DEMO_DESKS) await this.seedDesk(demo, admin[0], adminUserId);
    await this.seedTickets(adminUserId);
  }

  /** A few tickets in different states (the administrator is sender and assignee), so the lists and the figures have something to show. Only on an empty tickets table. */
  private async seedTickets(adminUserId: string): Promise<void> {
    if ((await this.db.query('SELECT 1 FROM tickets LIMIT 1')).length > 0) return;
    const types = await this.db.query<{ id: string; desk_id: string; is_personal: boolean }[]>('SELECT id, desk_id, is_personal FROM ticket_types ORDER BY sort_order, name_en');
    for (const [index, sample] of SAMPLE_TICKETS.entries()) {
      const type = types.filter((x) => x.is_personal === !!sample.personal)[index % types.filter((x) => x.is_personal === !!sample.personal).length];
      if (type) await this.insertTicket(type, sample, adminUserId);
    }
    this.logger.log(`${SAMPLE_TICKETS.length} sample tickets created`);
  }

  private async insertTicket(type: { id: string; desk_id: string; is_personal: boolean }, sample: SampleTicket, userId: string): Promise<void> {
    const closed = sample.status === 'closed';
    const rows = await this.db.query<{ id: string }[]>(
      `INSERT INTO tickets (sender_user_id, desk_id, type_id, title, details, priority, needed_by, assignee_user_id, is_personal, status, close_reason,
                           first_response_at, close_requested_at, closed_at, last_activity_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, current_date + $7::int, $1, $8, $9::varchar, $10,
               CASE WHEN $11 THEN now() - ($12::int - 1) * interval '1 day' END, CASE WHEN $9::varchar <> 'open' THEN now() - ($12::int - 1) * interval '1 day' END,
               CASE WHEN $13 THEN now() - interval '1 day' END, now() - ($14::int) * interval '1 day', now() - $12::int * interval '1 day') RETURNING id`,
      [userId, type.desk_id, type.id, sample.title, sample.details, sample.urgent ? 1 : 0, sample.dueInDays, !!sample.personal, sample.status, closed ? (sample.reason ?? 'confirmed') : null, sample.status !== 'open' || !!sample.answered, sample.ageDays, closed, sample.quietDays ?? 0],
    );
    await this.db.query(`INSERT INTO ticket_events (ticket_id, type, actor_user_id, created_at) VALUES ($1, 'created', $2, now() - $3::int * interval '1 day')`, [rows[0]?.id, userId, sample.ageDays]);
  }

  /** Only the administrator's own company gets sample desks (the administrator is their manager). */
  private async seedDesk(demo: (typeof DEMO_DESKS)[number], admin: { id: string; company_id: string }, adminUserId: string): Promise<void> {
    const departments = await this.db.query<{ id: string }[]>(
      `SELECT n.id FROM org_nodes n
       JOIN org_levels l ON l.id = n.org_level_id AND l.template_code = 'department' AND l.deleted_at IS NULL
       JOIN org_node_translations t ON t.org_node_id = n.id AND t.lang = 'ar' AND t.name = $1
       WHERE n.deleted_at IS NULL AND n.company_id = $2`,
      [demo.departmentAr, admin.company_id],
    );
    for (const { id } of departments) {
      if ((await this.db.query('SELECT 1 FROM ticket_desks WHERE org_node_id = $1', [id])).length > 0) continue;
      await this.db.query('UPDATE org_nodes SET manager_id = COALESCE(manager_id, $2) WHERE id = $1', [id, admin.id]);
      await this.db.query(`INSERT INTO ticket_desks (org_node_id, reception_status, accepts_personal) VALUES ($1, 'active', $2)`, [id, demo.acceptsPersonal]);
      for (const [index, type] of demo.types.entries()) {
        await this.db.query(
          `INSERT INTO ticket_types (desk_id, name_ar, name_en, description_ar, description_en, default_assignee_user_id, is_personal, sort_order) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [id, type.nameAr, type.nameEn, type.descriptionAr, type.descriptionEn, adminUserId, type.isPersonal ?? false, index + 1],
        );
      }
      this.logger.log(`Sample ticket desk created for "${demo.departmentAr}"`);
    }
  }
}
