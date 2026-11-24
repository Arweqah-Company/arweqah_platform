import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, LessThan, Repository, type EntityManager } from 'typeorm';
import type { AgentFileDto } from '@arweqah-platform/shared';
import { AgentRepository, type NewAgentMessage } from '../../domain/contracts/agent.repository';
import { AgentConversation, AgentMessage, AgentMessageFile, type StoredDraftResult } from '../../domain/entities/agent.entities';

@Injectable()
export class TypeOrmAgentRepository extends AgentRepository {
  constructor(
    @InjectRepository(AgentConversation) private readonly conversations: Repository<AgentConversation>,
    @InjectRepository(AgentMessage) private readonly messages: Repository<AgentMessage>,
    private readonly dataSource: DataSource,
  ) {
    super();
  }

  createConversation(userId: string, title: string): Promise<AgentConversation> {
    return this.conversations.save(this.conversations.create({ userId, title }));
  }

  findConversation(id: string, userId: string): Promise<AgentConversation | null> {
    return this.conversations.findOne({ where: { id, userId } });
  }

  listConversations(userId: string, limit: number): Promise<AgentConversation[]> {
    return this.conversations.find({ where: { userId }, order: { updatedAt: 'DESC' }, take: limit });
  }

  addMessage(message: NewAgentMessage): Promise<AgentMessage> {
    const { draft, draftExpiresAt, links, form, fileIds = [], ...rest } = message;
    return this.dataSource.transaction(async (manager) => {
      const saved = await manager.save(
        manager.create(AgentMessage, { ...rest, draft: draft ?? null, draftStatus: draft ? 'pending' : null, draftExpiresAt: draftExpiresAt ?? null, links: links ?? null, form: form ?? null, formStatus: form ? 'open' : null }),
      );
      if (fileIds.length) await manager.insert(AgentMessageFile, fileIds.map((fileId, position) => ({ messageId: saved.id, fileId, position })));
      return (await this.withFiles([saved], manager))[0]!;
    });
  }

  async recentMessages(conversationId: string, limit: number, upTo?: Date): Promise<AgentMessage[]> {
    const rows = await this.messages.find({ where: { conversationId, ...(upTo && { createdAt: LessThan(new Date(upTo.getTime() + 1)) }) }, order: { createdAt: 'DESC', id: 'DESC' }, take: limit });
    return this.withFiles(rows.reverse());
  }

  async findDraftMessage(id: string, userId: string): Promise<AgentMessage | null> {
    return this.findMessage(id, userId);
  }

  async findMessage(id: string, userId: string): Promise<AgentMessage | null> {
    const row = await this.messages.findOne({ where: { id, conversation: { userId } }, relations: { conversation: true } });
    return row ? (await this.withFiles([row]))[0]! : null;
  }

  /** Fills `files` of each message from the links, in the order they were sent. */
  private async withFiles(rows: AgentMessage[], manager: EntityManager = this.dataSource.manager): Promise<AgentMessage[]> {
    if (!rows.length) return rows;
    const found = await manager
      .createQueryBuilder(AgentMessageFile, 'link')
      .innerJoin('files', 'f', 'f.id = link.file_id')
      .select(['link.message_id AS "messageId"', 'f.id AS "id"', 'f.original_name AS "name"', 'f.content_type AS "contentType"', 'f.size AS "size"'])
      .where({ messageId: In(rows.map((r) => r.id)) })
      .orderBy('link.position', 'ASC')
      .getRawMany<AgentFileDto & { messageId: string }>();
    for (const row of rows) row.files = found.filter((f) => f.messageId === row.id).map(({ id, name, contentType, size }) => ({ id, name, contentType, size }));
    return rows;
  }

  async conversationImages(conversationId: string, limit: number): Promise<AgentFileDto[]> {
    const rows = await this.dataSource
      .createQueryBuilder()
      .select(['f.id AS "id"', 'f.original_name AS "name"', 'f.content_type AS "contentType"', 'f.size AS "size"'])
      .from(AgentMessageFile, 'link')
      .innerJoin(AgentMessage, 'm', 'm.id = link.message_id')
      .innerJoin('files', 'f', 'f.id = link.file_id')
      .where('m.conversation_id = :conversationId', { conversationId })
      .orderBy('m.created_at', 'DESC')
      .addOrderBy('link.position', 'ASC')
      .limit(limit)
      .getRawMany<AgentFileDto>();
    return rows;
  }

  async linkedFileIds(fileIds: string[]): Promise<string[]> {
    if (!fileIds.length) return [];
    const rows = await this.dataSource.getRepository(AgentMessageFile).find({ where: { fileId: In(fileIds) }, select: { fileId: true } });
    return rows.map((r) => r.fileId);
  }

  async canReadFile(fileId: string, userId: string): Promise<boolean> {
    return this.dataSource.getRepository(AgentMessageFile).exists({ where: { fileId, message: { conversation: { userId } } } });
  }

  async moveForm(id: string, from: 'open' | 'submitted', to: 'open' | 'submitted'): Promise<boolean> {
    const done = await this.messages.update({ id, formStatus: from }, { formStatus: to });
    return (done.affected ?? 0) === 1;
  }

  /** One draft at a time: the conversation row is locked, so a second proposal waits for the first to commit and then cancels it. */
  replacePendingDraft(message: NewAgentMessage): Promise<AgentMessage> {
    return this.messages.manager.transaction(async (manager) => {
      await manager.createQueryBuilder(AgentConversation, 'c').setLock('pessimistic_write').where('c.id = :id', { id: message.conversationId }).getOne();
      await manager.update(AgentMessage, { conversationId: message.conversationId, draftStatus: 'pending' }, { draftStatus: 'cancelled' });
      const { draft, draftExpiresAt, ...rest } = message;
      return manager.save(manager.create(AgentMessage, { ...rest, draft: draft ?? null, draftStatus: draft ? 'pending' : null, draftExpiresAt: draftExpiresAt ?? null, links: null, form: null, formStatus: null }));
    });
  }

  async claimDraft(id: string, now: Date): Promise<boolean> {
    // The expiry is read from the database clock when the row is checked (clock_timestamp, not the transaction's start), so a draft that lapsed while the claim waited for the row lock is refused.
    const done = await this.messages.createQueryBuilder().update().set({ draftStatus: 'confirmed', executedAt: now }).where('id = :id AND draft_status = :pending AND draft_expires_at > clock_timestamp()', { id, pending: 'pending' }).execute();
    return (done.affected ?? 0) === 1;
  }

  async finishDraft(id: string, status: 'confirmed' | 'failed', result: StoredDraftResult): Promise<void> {
    await this.messages.update({ id }, { draftStatus: status, result });
  }

  async setDraftStatus(id: string, status: 'cancelled' | 'expired'): Promise<void> {
    await this.messages.update({ id, draftStatus: 'pending' }, { draftStatus: status });
  }

  async touchConversation(id: string): Promise<void> {
    await this.conversations.update({ id }, { updatedAt: new Date() });
  }
}
