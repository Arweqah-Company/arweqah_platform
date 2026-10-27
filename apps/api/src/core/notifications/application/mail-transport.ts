import type { ProviderKey, ProviderValues } from '@arweqah-platform/shared';
import type { MailReceipt, OutgoingMail } from './notification-channel';

/** Strategy: one class per way of delivering e-mail (SMTP, Amazon SES, SendGrid, Microsoft Graph). */
export abstract class MailTransport {
  abstract send(mail: OutgoingMail): Promise<MailReceipt>;
}

/** Builds the transport for one provider from its data. A test replaces it with a fake. */
export abstract class MailTransportFactory {
  abstract create(providerKey: ProviderKey, values: ProviderValues): MailTransport;
}
