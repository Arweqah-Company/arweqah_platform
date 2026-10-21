import type { EmailLogDto, EmailLogQuery, EmailPurpose, Paginated } from '@arweqah-platform/shared';

export abstract class EmailLogRepository {
  /** Records an attempt before it is made; returns its id. */
  abstract start(entry: { to: string; subject: string; purpose: EmailPurpose }): Promise<string>;
  abstract markSent(id: string, receipt: { messageId: string | null; response: string | null }): Promise<void>;
  abstract markFailed(id: string, error: string): Promise<void>;
  abstract search(query: EmailLogQuery): Promise<Paginated<EmailLogDto>>;
}
