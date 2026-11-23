import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import type { NoticeChannelCode } from '@arweqah-platform/shared';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import { returnedRows } from '../../../../common/infrastructure/query-result';
import { managerOf } from '../../../../common/infrastructure/typeorm-transaction-runner';
import { NoticeRepository } from '../../domain/contracts/notice.repository';
import { Notice, NoticeAttachment, NoticeAudience, NoticeChannel, NoticeChannelWriter, NoticeSettings, NoticeVersion } from '../../domain/entities/notice.entities';
import type { AttachmentRow, AudienceRuleRow, NewNotice, NoticePatch, NoticeRecord, VersionContent } from '../../domain/types/notice.types';

const SETTINGS_ID = 1;

@Injectable()
export class TypeOrmNoticeRepository extends NoticeRepository {
  constructor(private readonly ds: DataSource) {
    super();
  }

  private m(tx?: TransactionContext): EntityManager {
    return managerOf(tx, this.ds.manager);
  }

  async insert(data: NewNotice, tx: TransactionContext): Promise<Notice> {
    const m = this.m(tx);
    return m.save(m.create(Notice, { ...data, status: 'draft', revision: 1, currentVersion: 0 }));
  }

  async find(id: string, tx?: TransactionContext): Promise<NoticeRecord | null> {
    const m = this.m(tx);
    const notice = await m.findOne(Notice, { where: { id } });
    if (!notice) return null;
    const rows: { companyId: string | null }[] = notice.authorUnitId ? await m.query('SELECT company_id AS "companyId" FROM org_nodes WHERE id = $1', [notice.authorUnitId]) : [];
    return Object.assign(notice, { unitCompanyId: rows[0]?.companyId ?? null });
  }

  async patch(id: string, expectedRevision: number, patch: NoticePatch, tx: TransactionContext): Promise<boolean> {
    const result = await this.m(tx)
      .createQueryBuilder()
      .update(Notice)
      .set({ ...patch, revision: () => 'revision + 1' })
      .where('id = :id AND revision = :expectedRevision', { id, expectedRevision })
      .returning('id')
      .execute();
    return returnedRows<{ id: string }>(result.raw).length === 1;
  }

  async remove(id: string, tx: TransactionContext): Promise<void> {
    await this.m(tx).delete(Notice, { id });
  }

  async recordDelivery(id: string, batchesDone: number, completed: boolean, tx: TransactionContext): Promise<void> {
    await this.m(tx).update(Notice, { id }, { batchesDone, ...(completed ? { deliveryCompletedAt: new Date() } : {}) });
  }

  versions(noticeId: string, tx?: TransactionContext): Promise<NoticeVersion[]> {
    return this.m(tx).find(NoticeVersion, { where: { noticeId }, order: { version: 'ASC' } });
  }

  async saveVersion(noticeId: string, version: number, content: VersionContent, tx: TransactionContext): Promise<void> {
    await this.m(tx).upsert(NoticeVersion, { noticeId, version, ...content, isDraft: true }, ['noticeId', 'version']);
  }

  async removeVersion(noticeId: string, version: number, tx: TransactionContext): Promise<void> {
    await this.m(tx).delete(NoticeVersion, { noticeId, version });
  }

  async markVersionPublished(noticeId: string, version: number, tx: TransactionContext): Promise<void> {
    await this.m(tx).update(NoticeVersion, { noticeId, version }, { isDraft: false });
  }

  async audienceOf(noticeId: string, version: number, tx?: TransactionContext): Promise<AudienceRuleRow[]> {
    const rows = await this.m(tx).find(NoticeAudience, { where: { noticeId, version }, order: { id: 'ASC' } });
    return rows.map((r) => ({ type: r.type, refId: r.refId, includeBelow: r.includeBelow }));
  }

  async replaceAudience(noticeId: string, version: number, rules: AudienceRuleRow[], tx: TransactionContext): Promise<void> {
    const m = this.m(tx);
    await m.delete(NoticeAudience, { noticeId, version });
    if (rules.length) await m.insert(NoticeAudience, rules.map((r) => ({ noticeId, version, type: r.type as NoticeAudience['type'], refId: r.refId, includeBelow: r.includeBelow })));
  }

  async attachmentsOf(noticeId: string, version: number): Promise<AttachmentRow[]> {
    return this.ds.query(
      `SELECT a.file_id AS "fileId", f.original_name AS "originalName", f.content_type AS "contentType", f.size::int AS size, f.created_at AS "createdAt"
       FROM notice_attachments a JOIN files f ON f.id = a.file_id WHERE a.notice_id = $1 AND a.version = $2 ORDER BY a.position, a.id`,
      [noticeId, version],
    );
  }

  async replaceAttachments(noticeId: string, version: number, fileIds: string[], tx: TransactionContext): Promise<void> {
    const m = this.m(tx);
    await m.delete(NoticeAttachment, { noticeId, version });
    if (fileIds.length) await m.insert(NoticeAttachment, fileIds.map((fileId, position) => ({ noticeId, version, fileId, position })));
  }

  async copyParts(noticeId: string, from: number, to: number, tx: TransactionContext): Promise<void> {
    const m = this.m(tx);
    await m.query(`INSERT INTO notice_audiences (notice_id, version, type, ref_id, include_below) SELECT notice_id, $3, type, ref_id, include_below FROM notice_audiences WHERE notice_id = $1 AND version = $2`, [noticeId, from, to]);
    await m.query(`INSERT INTO notice_attachments (notice_id, version, file_id, position) SELECT notice_id, $3, file_id, position FROM notice_attachments WHERE notice_id = $1 AND version = $2`, [noticeId, from, to]);
  }

  async removeParts(noticeId: string, version: number, tx: TransactionContext): Promise<void> {
    const m = this.m(tx);
    await m.delete(NoticeAudience, { noticeId, version });
    await m.delete(NoticeAttachment, { noticeId, version });
  }

  async hasAttachment(noticeId: string, fileId: string): Promise<boolean> {
    return (await this.ds.manager.count(NoticeAttachment, { where: { noticeId, fileId } })) > 0;
  }

  async unpinAll(tx: TransactionContext): Promise<void> {
    await this.m(tx).update(Notice, { isPinned: true }, { isPinned: false, pinnedAt: null });
  }

  channels(): Promise<NoticeChannel[]> {
    return this.ds.manager.find(NoticeChannel, { order: { code: 'ASC' } });
  }

  channelByCode(code: NoticeChannelCode): Promise<NoticeChannel | null> {
    return this.ds.manager.findOne(NoticeChannel, { where: { code } });
  }

  channelById(id: string): Promise<NoticeChannel | null> {
    return this.ds.manager.findOne(NoticeChannel, { where: { id } });
  }

  async isWriter(userId: string, channelId: string): Promise<boolean> {
    return (await this.ds.manager.count(NoticeChannelWriter, { where: { userId, channelId } })) > 0;
  }

  async writerChannelIds(userId: string): Promise<string[]> {
    return (await this.ds.manager.find(NoticeChannelWriter, { where: { userId } })).map((w) => w.channelId);
  }

  async settings(): Promise<NoticeSettings> {
    return (await this.ds.manager.findOne(NoticeSettings, { where: { id: SETTINGS_ID } })) ?? Object.assign(new NoticeSettings(), { id: SETTINGS_ID, batchSize: 500, batchIntervalMinutes: 5, updatedBy: null });
  }

  async saveSettings(batchSize: number, intervalMinutes: number, updatedBy: string | null): Promise<NoticeSettings> {
    await this.ds.manager.upsert(NoticeSettings, { id: SETTINGS_ID, batchSize, batchIntervalMinutes: intervalMinutes, updatedBy }, ['id']);
    return this.settings();
  }
}
