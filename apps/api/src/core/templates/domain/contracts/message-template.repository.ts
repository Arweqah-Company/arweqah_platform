import type { TemplateKind } from '@arweqah-platform/shared';
import type { MessageTemplate } from '../entities/message-template.entity';

export abstract class MessageTemplateRepository {
  abstract findAll(kind: TemplateKind): Promise<MessageTemplate[]>;
  abstract find(kind: TemplateKind, key: string): Promise<MessageTemplate | null>;
  abstract save(row: Partial<MessageTemplate> & Pick<MessageTemplate, 'kind' | 'key'>): Promise<MessageTemplate>;
  abstract remove(kind: TemplateKind, key: string): Promise<void>;
  abstract requireApproval(kind: TemplateKind): Promise<boolean>;
  abstract setRequireApproval(kind: TemplateKind, value: boolean, actorId: string): Promise<void>;
  /** Names of the people behind a pending change, for the list. */
  abstract namesOf(userIds: string[]): Promise<Map<string, string>>;
}
