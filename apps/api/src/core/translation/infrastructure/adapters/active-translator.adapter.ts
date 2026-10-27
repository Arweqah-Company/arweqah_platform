import { Injectable } from '@nestjs/common';
import { AppConfig } from '../../../../config/app-config.service';
import { ActiveProviders } from '../../../integrations/application/services/active-providers.service';
import { Translator } from '../../domain/contracts/translator';
import { TranslatorFactory } from '../../domain/contracts/translator-factory';
import { AwsTranslator, DisabledTranslator } from './aws-translator.adapter';

/**
 * The translator the forms use: the provider an administrator activated, else the AWS keys of the server's own
 * settings (.env), else none. The client built from a provider is kept until its data changes.
 */
@Injectable()
export class ActiveTranslator extends Translator {
  private built: { fingerprint: string; translator: Translator } | null = null;

  constructor(
    private readonly active: ActiveProviders,
    private readonly factory: TranslatorFactory,
    private readonly config: AppConfig,
  ) {
    super();
  }

  async arabicToEnglish(text: string): Promise<string> {
    return (await this.current()).arabicToEnglish(text);
  }

  private async current(): Promise<Translator> {
    const provider = await this.active.of('translation');
    if (provider) {
      if (this.built?.fingerprint !== provider.fingerprint) this.built = { fingerprint: provider.fingerprint, translator: this.factory.create(provider.providerKey, provider.values) };
      return this.built.translator;
    }
    this.built = null;
    const server = this.config.translate;
    return server ? this.serverTranslator(server) : new DisabledTranslator();
  }

  private serverTranslator(settings: NonNullable<AppConfig['translate']>): Translator {
    const fingerprint = `server:${settings.accessKeyId}:${settings.region}`;
    if (this.built?.fingerprint !== fingerprint) this.built = { fingerprint, translator: new AwsTranslator(settings) };
    return this.built.translator;
  }
}
