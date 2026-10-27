import { Injectable } from '@nestjs/common';
import type { ProviderKey, ProviderValues } from '@arweqah-platform/shared';
import { MailTransport, MailTransportFactory } from '../../application/mail-transport';
import { GraphMailTransport } from './graph-mail.transport';
import { SendGridMailTransport } from './sendgrid-mail.transport';
import { SesMailTransport } from './ses-mail.transport';
import { SmtpMailTransport } from './smtp-mail.transport';

const text = (values: ProviderValues, key: string): string => String(values[key] ?? '');

/** Strategy selection: one class per provider, picked by the provider's key. */
@Injectable()
export class ProviderMailTransportFactory extends MailTransportFactory {
  create(providerKey: ProviderKey, values: ProviderValues): MailTransport {
    switch (providerKey) {
      case 'smtp':
        return new SmtpMailTransport({
          host: text(values, 'host'),
          port: Number(values.port),
          secure: values.secure === true,
          user: text(values, 'user') || undefined,
          password: text(values, 'password') || undefined,
          from: text(values, 'from'),
        });
      case 'ses':
        return new SesMailTransport({ accessKeyId: text(values, 'accessKeyId'), secretAccessKey: text(values, 'secretAccessKey'), region: text(values, 'region'), from: text(values, 'from') });
      case 'sendgrid':
        return new SendGridMailTransport({ apiKey: text(values, 'apiKey'), from: text(values, 'from') });
      case 'graph':
        return new GraphMailTransport({ tenantId: text(values, 'tenantId'), clientId: text(values, 'clientId'), clientSecret: text(values, 'clientSecret'), sender: text(values, 'sender') });
      default:
        throw new Error(`${providerKey} is not an e-mail provider`);
    }
  }
}
