import type { NoticeChannelCode } from '@arweqah-platform/shared';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import type { Notice, NoticeChannel, NoticeSettings, NoticeVersion } from '../entities/notice.entities';
import type { AttachmentRow, AudienceRuleRow, NewNotice, NoticePatch, NoticeRecord, VersionContent } from '../types/notice.types';

/** Writing a notice and its parts (versions, audience rules, attachments), and the plain reads of one notice. */
export abstract class NoticeRepository {
  abstract insert(data: NewNotice, tx: TransactionContext): Promise<Notice>;
  abstract find(id: string, tx?: TransactionContext): Promise<NoticeRecord | null>;
  /** Applies the patch only while the revision is still `expectedRevision` (and bumps it); false when somebody changed the notice first. */
  abstract patch(id: string, expectedRevision: number, patch: NoticePatch, tx: TransactionContext): Promise<boolean>;
  abstract remove(id: string, tx: TransactionContext): Promise<void>;
  /** The progress of the delivery of the current version (not a business change: the revision counter is left alone). */
  abstract recordDelivery(id: string, batchesDone: number, completed: boolean, tx: TransactionContext): Promise<void>;

  abstract versions(noticeId: string, tx?: TransactionContext): Promise<NoticeVersion[]>;
  /** Creates the version or replaces the content of its draft. */
  abstract saveVersion(noticeId: string, version: number, content: VersionContent, tx: TransactionContext): Promise<void>;
  abstract removeVersion(noticeId: string, version: number, tx: TransactionContext): Promise<void>;
  abstract markVersionPublished(noticeId: string, version: number, tx: TransactionContext): Promise<void>;

  abstract audienceOf(noticeId: string, version: number, tx?: TransactionContext): Promise<AudienceRuleRow[]>;
  abstract replaceAudience(noticeId: string, version: number, rules: AudienceRuleRow[], tx: TransactionContext): Promise<void>;
  abstract attachmentsOf(noticeId: string, version: number): Promise<AttachmentRow[]>;
  abstract replaceAttachments(noticeId: string, version: number, fileIds: string[], tx: TransactionContext): Promise<void>;
  /** Copies the audience and the attachments of one version to another (a new version starts as a copy of the published one). */
  abstract copyParts(noticeId: string, from: number, to: number, tx: TransactionContext): Promise<void>;
  abstract removeParts(noticeId: string, version: number, tx: TransactionContext): Promise<void>;
  abstract hasAttachment(noticeId: string, fileId: string): Promise<boolean>;

  /** Takes the pin off every notice (at most one is pinned, the unique index keeps it so). */
  abstract unpinAll(tx: TransactionContext): Promise<void>;

  abstract channels(): Promise<NoticeChannel[]>;
  abstract channelByCode(code: NoticeChannelCode): Promise<NoticeChannel | null>;
  abstract channelById(id: string): Promise<NoticeChannel | null>;
  abstract isWriter(userId: string, channelId: string): Promise<boolean>;
  abstract writerChannelIds(userId: string): Promise<string[]>;

  abstract settings(): Promise<NoticeSettings>;
  abstract saveSettings(batchSize: number, intervalMinutes: number, updatedBy: string | null): Promise<NoticeSettings>;
}
