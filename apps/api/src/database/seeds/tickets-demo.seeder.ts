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
