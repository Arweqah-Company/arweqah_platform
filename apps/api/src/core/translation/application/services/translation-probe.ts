import { Injectable, OnModuleInit } from '@nestjs/common';
import type { ProviderKey, ProviderValues, TestProviderInput, TestResultDto } from '@arweqah-platform/shared';
import { ProbeRegistry } from '../../../integrations/application/services/probe-registry';
import { ProviderProbe } from '../../../integrations/domain/contracts/provider-probe';
import { ProviderTestInputError } from '../../../integrations/domain/errors/integrations.errors';
import { TranslatorFactory } from '../../domain/contracts/translator-factory';
import { TranslationUnavailableError } from '../../domain/errors/translation.errors';

/** How a translation provider is tried from the dashboard: Arabic text goes in, the English comes back or the provider's own error. */
@Injectable()
export class TranslationProbe extends ProviderProbe implements OnModuleInit {
  readonly kind = 'translation' as const;

  constructor(
    private readonly factory: TranslatorFactory,
    private readonly registry: ProbeRegistry,
  ) {
    super();
  }

  onModuleInit(): void {
    this.registry.register(this);
  }

  async run(providerKey: ProviderKey, values: ProviderValues, input: TestProviderInput): Promise<TestResultDto> {
    if (!input.text) throw new ProviderTestInputError('text');
    try {
      const text = await this.factory.create(providerKey, values).arabicToEnglish(input.text);
      return { ok: true, message: null, text };
    } catch (error) {
      const cause = error instanceof TranslationUnavailableError ? error.cause : error;
      return { ok: false, message: cause instanceof Error ? cause.message : String(cause ?? 'Unknown error'), text: null };
    }
  }
}
