import { Injectable, OnModuleInit } from '@nestjs/common';
import type { ProviderKey, ProviderValues, TestProviderInput, TestResultDto } from '@arweqah-platform/shared';
import { ProbeRegistry } from '../../integrations/application/services/probe-registry';
import { ProviderProbe } from '../../integrations/domain/contracts/provider-probe';
import { ProviderTestInputError } from '../../integrations/domain/errors/integrations.errors';
import { MailTransportFactory } from './mail-transport';

/** How an e-mail provider is tried from the dashboard: a short message goes to any address with the data in the form. */
@Injectable()
export class EmailProbe extends ProviderProbe implements OnModuleInit {
  readonly kind = 'email' as const;

  constructor(
    private readonly factory: MailTransportFactory,
    private readonly registry: ProbeRegistry,
  ) {
    super();
  }

  onModuleInit(): void {
    this.registry.register(this);
  }

  async run(providerKey: ProviderKey, values: ProviderValues, input: TestProviderInput): Promise<TestResultDto> {
    if (!input.to) throw new ProviderTestInputError('to');
    try {
      const receipt = await this.factory.create(providerKey, values).send({
        to: input.to,
        subject: 'Arweqah Platform: test message / رسالة تجريبية',
        text: 'This is a test message from the Arweqah Platform e-mail settings. If you can read it, the provider works.\n\nهذه رسالة تجريبية من إعدادات البريد في منصة أروقة. إن وصلتك فالمزود يعمل.',
        purpose: 'other',
      });
      return { ok: true, message: receipt.response, text: null };
    } catch (error) {
      const cause = (error as { details?: { cause?: string } }).details?.cause ?? (error as Error).message;
      return { ok: false, message: cause, text: null };
    }
  }
}
