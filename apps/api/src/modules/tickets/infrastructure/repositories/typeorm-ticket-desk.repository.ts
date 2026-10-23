import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import type { ReceptionStatus } from '@arweqah-platform/shared';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import { managerOf } from '../../../../common/infrastructure/typeorm-transaction-runner';
import { TicketDeskRepository } from '../../domain/contracts/ticket-desk.repository';
import type { DeskRecord, DeskSettingsValues, TypeRecord, TypeValues } from '../../domain/types/ticket.types';

const DESK_COLUMNS = `org_node_id AS "orgNodeId", reception_status AS "receptionStatus", description_ar AS "descriptionAr", description_en AS "descriptionEn",
  accepts_personal AS "acceptsPersonal", default_due_days AS "defaultDueDays", min_lead_days AS "minLeadDays", auto_close_days AS "autoCloseDays",
  reopen_window_days AS "reopenWindowDays", stale_after_days AS "staleAfterDays"`;

const DESKS_BY_ID = `SELECT ${DESK_COLUMNS} FROM ticket_desks WHERE org_node_id = ANY($1)`;

const TYPE_SELECT = `
  SELECT t.id, t.desk_id AS "deskId", t.name_ar AS "nameAr", t.name_en AS "nameEn", t.description_ar AS "descriptionAr", t.description_en AS "descriptionEn",
         t.default_assignee_user_id AS "defaultAssigneeUserId", COALESCE(e.full_name, u.name) AS "defaultAssigneeName",
         t.due_days AS "dueDays", t.is_personal AS "isPersonal", t.is_active AS "isActive"
  FROM ticket_types t
  LEFT JOIN users u ON u.id = t.default_assignee_user_id
  LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL`;

const TYPES_OF_DESKS = `${TYPE_SELECT} WHERE t.desk_id = ANY($1) ORDER BY t.sort_order, t.created_at`;
const TYPE_BY_ID = `${TYPE_SELECT} WHERE t.id = $1`;

@Injectable()
export class TypeOrmTicketDeskRepository extends TicketDeskRepository {
  constructor(private readonly ds: DataSource) {
    super();
  }

  private m(tx?: TransactionContext): EntityManager {
    return managerOf(tx, this.ds.manager);
  }

  async find(deskId: string): Promise<DeskRecord | null> {
    return (await this.findMany([deskId]))[0] ?? null;
  }

  async findMany(deskIds: string[]): Promise<DeskRecord[]> {
    if (!deskIds.length) return [];
    const rows: (Omit<DeskRecord, 'receptionStatus'> & { receptionStatus: string })[] = await this.ds.query(DESKS_BY_ID, [deskIds]);
    return rows.map((r) => ({ ...r, receptionStatus: r.receptionStatus as ReceptionStatus }));
  }

  async save(deskId: string, v: DeskSettingsValues, tx: TransactionContext): Promise<void> {
    await this.m(tx).query(
      `INSERT INTO ticket_desks (org_node_id, reception_status, description_ar, description_en, accepts_personal, default_due_days, min_lead_days, auto_close_days, reopen_window_days, stale_after_days)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (org_node_id) DO UPDATE SET reception_status = $2, description_ar = $3, description_en = $4, accepts_personal = $5, default_due_days = $6,
         min_lead_days = $7, auto_close_days = $8, reopen_window_days = $9, stale_after_days = $10, updated_at = now()`,
      [deskId, v.receptionStatus, v.descriptionAr, v.descriptionEn, v.acceptsPersonal, v.defaultDueDays, v.minLeadDays, v.autoCloseDays, v.reopenWindowDays, v.staleAfterDays],
    );
  }

  typesOfDesks(deskIds: string[]): Promise<TypeRecord[]> {
    if (!deskIds.length) return Promise.resolve([]);
    return this.ds.query(TYPES_OF_DESKS, [deskIds]);
  }

  async type(typeId: string): Promise<TypeRecord | null> {
    const rows: TypeRecord[] = await this.ds.query(TYPE_BY_ID, [typeId]);
    return rows[0] ?? null;
  }

  async insertType(deskId: string, v: TypeValues, tx: TransactionContext): Promise<string> {
    const rows: { id: string }[] = await this.m(tx).query(
      `INSERT INTO ticket_types (desk_id, name_ar, name_en, description_ar, description_en, default_assignee_user_id, due_days, is_personal, is_active, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM ticket_types WHERE desk_id = $1))
       RETURNING id`,
      [deskId, v.nameAr, v.nameEn, v.descriptionAr, v.descriptionEn, v.defaultAssigneeUserId, v.dueDays, v.isPersonal, v.isActive],
    );
    return rows[0]?.id as string;
  }

  async updateType(typeId: string, v: TypeValues, tx: TransactionContext): Promise<void> {
    await this.m(tx).query(
      `UPDATE ticket_types SET name_ar = $2, name_en = $3, description_ar = $4, description_en = $5, default_assignee_user_id = $6, due_days = $7,
         is_personal = $8, is_active = $9, updated_at = now() WHERE id = $1`,
      [typeId, v.nameAr, v.nameEn, v.descriptionAr, v.descriptionEn, v.defaultAssigneeUserId, v.dueDays, v.isPersonal, v.isActive],
    );
  }

  async typeHasTickets(typeId: string): Promise<boolean> {
    return (await this.ds.query('SELECT 1 FROM tickets WHERE type_id = $1 LIMIT 1', [typeId])).length > 0;
  }

  async deleteType(typeId: string, tx: TransactionContext): Promise<void> {
    await this.m(tx).query('DELETE FROM ticket_types WHERE id = $1', [typeId]);
  }
}
