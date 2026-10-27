import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { TemplateKind } from '@arweqah-platform/shared';
import { MessageTemplateRepository } from '../../domain/contracts/message-template.repository';
import { MessageTemplate } from '../../domain/entities/message-template.entity';
import { TemplateSetting } from '../../domain/entities/template-setting.entity';

@Injectable()
export class TypeOrmMessageTemplateRepository extends MessageTemplateRepository {
  constructor(
    @InjectRepository(MessageTemplate) private readonly rows: Repository<MessageTemplate>,
    @InjectRepository(TemplateSetting) private readonly settings: Repository<TemplateSetting>,
  ) {
    super();
  }

  findAll(kind: TemplateKind): Promise<MessageTemplate[]> {
    return this.rows.find({ where: { kind } });
  }

  find(kind: TemplateKind, key: string): Promise<MessageTemplate | null> {
    return this.rows.findOne({ where: { kind, key } });
  }

  /** One row per message, written in one statement: it changes the columns given and adds the row only the first time, even for two saves at once. */
  async save(row: Parameters<MessageTemplateRepository['save']>[0]): Promise<MessageTemplate> {
    await this.rows.upsert(row as never, ['kind', 'key']);
    return (await this.find(row.kind, row.key))!;
  }

  async remove(kind: TemplateKind, key: string): Promise<void> {
    await this.rows.delete({ kind, key });
  }

  async requireApproval(kind: TemplateKind): Promise<boolean> {
    return (await this.settings.findOne({ where: { kind } }))?.requireApproval ?? false;
  }

  async setRequireApproval(kind: TemplateKind, value: boolean, actorId: string): Promise<void> {
    await this.settings.upsert({ kind, requireApproval: value, updatedBy: actorId }, ['kind']);
  }

  /** Direct read of the users table: a name for the list, nothing else of the user leaves it. */
  async namesOf(userIds: string[]): Promise<Map<string, string>> {
    if (!userIds.length) return new Map();
    const rows = await this.rows.manager.query<{ id: string; name: string }[]>('SELECT id, name FROM users WHERE id = ANY($1)', [userIds]);
    return new Map(rows.map((r) => [r.id, r.name]));
  }
}
