import { Injectable } from '@nestjs/common';
import type { TestTemplateInput } from '@arweqah-platform/shared';
import { RateWindow } from '../../../common/application/rate-window';
import { NotFoundError } from '../../../common/domain/domain-error';
import { TemplateTestRateLimitedError } from '../../templates/domain/errors/templates.errors';
import { MessageTemplatesService } from '../../templates/application/services/message-templates.service';
import { TemplateRenderer } from '../../templates/application/services/template-renderer';
import { RecipientDirectory } from '../domain/notification.repository';
import { MailSender } from './notification-channel';

const TESTS_PER_MINUTE = 5;

/** «Send me a test»: the wording being edited, filled with example values, sent to the administrator's own address only. */
@Injectable()
export class TemplateTestMailService {
  /** A person can mail themselves only a few tests a minute: the test sends real mail. */
  private readonly window = new RateWindow(TESTS_PER_MINUTE, 60_000);

  constructor(
    private readonly templates: MessageTemplatesService,
    private readonly renderer: TemplateRenderer,
    private readonly directory: RecipientDirectory,
    private readonly mail: MailSender,
  ) {}

  async sendToSelf(key: string, input: TestTemplateInput, userId: string): Promise<{ sentTo: string }> {
    if (!this.window.take(userId)) throw new TemplateTestRateLimitedError();
    const def = this.templates.definition('email', key);
    const me = await this.directory.find(userId);
    if (!me) throw new NotFoundError('User', userId);
    const page = this.renderer.preview(def, this.templates.checked(def, input.content), input.lang);
    await this.mail.send({ purpose: 'test', to: me.email, subject: page.title, text: page.text, html: page.html });
    return { sentTo: me.email };
  }
}
