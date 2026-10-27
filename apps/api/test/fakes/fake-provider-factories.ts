import type { ProviderKey, ProviderValues } from '@arweqah-platform/shared';
import { MailTransport, MailTransportFactory } from '../../src/core/notifications/application/mail-transport';
import type { MailReceipt, OutgoingMail } from '../../src/core/notifications/application/notification-channel';
import { Translator } from '../../src/core/translation/domain/contracts/translator';
import { TranslatorFactory } from '../../src/core/translation/domain/contracts/translator-factory';
import { TranslationUnavailableError } from '../../src/core/translation/domain/errors/translation.errors';
import { ExternalServiceError } from '../../src/common/domain/domain-error';

export interface Built {
  providerKey: ProviderKey;
  values: ProviderValues;
}

/** Stands in for the real provider SDKs: CI never reaches AWS, Google, Azure, SES, SendGrid or Microsoft. `failure` makes every call fail with that message. */
export class FakeProviders {
  failure: string | null = null;
  readonly built: Built[] = [];
  readonly translated: string[] = [];
  readonly sent: OutgoingMail[] = [];

  reset(): void {
    this.failure = null;
    this.built.length = 0;
    this.translated.length = 0;
    this.sent.length = 0;
  }
}

export class FakeTranslatorFactory extends TranslatorFactory {
  constructor(private readonly fake: FakeProviders) {
    super();
  }

  create(providerKey: ProviderKey, values: ProviderValues): Translator {
    this.fake.built.push({ providerKey, values });
    const fake = this.fake;
    return new (class extends Translator {
      async arabicToEnglish(text: string): Promise<string> {
        if (fake.failure) throw new TranslationUnavailableError(fake.failure);
        fake.translated.push(text);
        return `${providerKey.toUpperCase()}: ${text}`;
      }
    })();
  }
}

export class FakeMailTransportFactory extends MailTransportFactory {
  constructor(private readonly fake: FakeProviders) {
    super();
  }

  create(providerKey: ProviderKey, values: ProviderValues): MailTransport {
    this.fake.built.push({ providerKey, values });
    const fake = this.fake;
    return new (class extends MailTransport {
      async send(mail: OutgoingMail): Promise<MailReceipt> {
        if (fake.failure) throw new ExternalServiceError('Email delivery failed', { cause: fake.failure });
        fake.sent.push(mail);
        return { messageId: 'id-1', response: `${providerKey} accepted` };
      }
    })();
  }
}
