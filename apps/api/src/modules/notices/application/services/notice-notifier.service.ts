import { Injectable } from '@nestjs/common';
import type { TransactionContext } from '../../../../common/application/transaction-runner';
import { NotificationsService } from '../../../../core/notifications/application/notifications.service';
import { TemplateRenderer } from '../../../../core/templates/application/services/template-renderer';
import { NOTICE_TEMPLATE_KEYS } from '../messages/notice-templates';
import type { NoticeNoticeKind } from '../messages/notice.messages';

export interface NoticeNoticeInput {
  kind: NoticeNoticeKind;
  recipients: string[];
  /** The notice the message is about (its title is meant for its audience; its text is never sent); left out for the messages about a channel. */
  notice?: { titleAr: string; titleEn: string | null };
  channel: { nameAr: string; nameEn: string };
  link: string;
  email?: boolean;
  authorName?: string;
  reason?: string;
  publishOn?: string | null;
  tx?: TransactionContext;
}

/** Sends the messages of the notices module in the app (the bell) and, for the important ones, by e-mail, inside the caller's transaction. */
@Injectable()
export class NoticeNotifier {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly templates: TemplateRenderer,
  ) {}

  async send(input: NoticeNoticeInput): Promise<void> {
    const userIds = [...new Set(input.recipients)];
    if (!userIds.length) return;
    const values = { authorName: input.authorName ?? '', reason: input.reason ?? '', publishOn: input.publishOn ?? '' };
    const titleAr = input.notice?.titleAr ?? '';
    const titleEn = input.notice?.titleEn || titleAr;
    const rendered = await this.templates.renderNotice(NOTICE_TEMPLATE_KEYS[input.kind], values, {
      ar: { noticeTitle: titleAr, channelName: input.channel.nameAr },
      en: { noticeTitle: titleEn, channelName: input.channel.nameEn },
    });
    await this.notifications.notify({ userIds, ...rendered, link: input.link, channels: input.email ? ['email'] : undefined, purpose: 'notices', tx: input.tx });
  }
}
