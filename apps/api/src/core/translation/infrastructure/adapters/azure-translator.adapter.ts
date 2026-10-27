import TextTranslationClient, { isUnexpected } from '@azure-rest/ai-translation-text';
import { Logger } from '@nestjs/common';
import { Translator } from '../../domain/contracts/translator';
import { TranslationUnavailableError } from '../../domain/errors/translation.errors';

export interface AzureTranslateSettings {
  key: string;
  region: string;
  endpoint: string;
}

/** Azure AI Translator (text translation REST API). */
export class AzureTranslator extends Translator {
  private readonly logger = new Logger(AzureTranslator.name);
  private readonly client: ReturnType<typeof TextTranslationClient>;

  constructor(settings: AzureTranslateSettings) {
    super();
    this.client = TextTranslationClient(settings.endpoint, { key: settings.key, region: settings.region });
  }

  async arabicToEnglish(text: string): Promise<string> {
    try {
      const response = await this.client.path('/translate').post({ body: { inputs: [{ text, language: 'ar', targets: [{ language: 'en' }] }] } });
      if (isUnexpected(response)) throw new Error(response.body.error?.message ?? 'Unexpected answer');
      const translated = response.body.value[0]?.translations[0]?.text;
      if (!translated) throw new Error('Empty answer');
      return translated;
    } catch (error) {
      this.logger.error(`Azure Translator failed: ${error instanceof Error ? error.name : 'unknown'}`);
      throw new TranslationUnavailableError(error instanceof Error ? error.message : 'Unknown error');
    }
  }
}
