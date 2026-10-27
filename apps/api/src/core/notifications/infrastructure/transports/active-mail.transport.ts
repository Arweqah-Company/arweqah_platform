import { Injectable } from '@nestjs/common';
import { AppConfig } from '../../../../config/app-config.service';
import { ActiveProviders } from '../../../integrations/application/services/active-providers.service';
import { MailTransport, MailTransportFactory } from '../../application/mail-transport';
import type { MailReceipt, OutgoingMail } from '../../application/notification-channel';
import { SmtpMailTransport } from './smtp-mail.transport';

/**
 * The transport every e-mail goes through: the provider an administrator activated, else the SMTP settings of the
 * server (.env). The transport built from a provider is kept until its data changes.
 */
@Injectable()
export class ActiveMailTransport extends MailTransport {
  private built: { fingerprint: string; transport: MailTransport } | null = null;

  constructor(
    private readonly active: ActiveProviders,
    private readonly factory: MailTransportFactory,
    private readonly config: AppConfig,
  ) {
    super();
  }

  async send(mail: OutgoingMail): Promise<MailReceipt> {
    return (await this.current()).send(mail);
  }

  private async current(): Promise<MailTransport> {
    const provider = await this.active.of('email');
    const fingerprint = provider ? provider.fingerprint : 'server';
    if (this.built?.fingerprint !== fingerprint) {
      const transport = provider ? this.factory.create(provider.providerKey, provider.values) : this.serverTransport();
      this.built = { fingerprint, transport };
    }
    return this.built.transport;
  }

  private serverTransport(): MailTransport {
    const user = this.config.get('SMTP_USER');
    return new SmtpMailTransport({
      host: this.config.get('SMTP_HOST'),
      port: this.config.get('SMTP_PORT'),
      secure: this.config.get('SMTP_SECURE'),
      user,
      password: this.config.get('SMTP_PASSWORD'),
      from: this.config.get('MAIL_FROM'),
    });
  }
}
