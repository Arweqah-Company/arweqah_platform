import { TranslateClient, TranslateTextCommand } from '@aws-sdk/client-translate';
import { Logger } from '@nestjs/common';
import { Translator } from '../../domain/contracts/translator';
import { TranslationUnavailableError } from '../../domain/errors/translation.errors';

export interface AwsTranslateSettings {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

/** Amazon Translate. The IAM user behind the keys may only call translate:TranslateText. */
export class AwsTranslator extends Translator {
  private readonly logger = new Logger(AwsTranslator.name);
  private readonly client: TranslateClient;

  constructor(settings: AwsTranslateSettings) {
    super();
    this.client = new TranslateClient({ region: settings.region, credentials: { accessKeyId: settings.accessKeyId, secretAccessKey: settings.secretAccessKey } });
  }

  async arabicToEnglish(text: string): Promise<string> {
    try {
      const out = await this.client.send(new TranslateTextCommand({ Text: text, SourceLanguageCode: 'ar', TargetLanguageCode: 'en' }));
      if (!out.TranslatedText) throw new Error('Empty answer');
      return out.TranslatedText;
    } catch (error) {
      this.logger.error(`Amazon Translate failed: ${error instanceof Error ? error.name : 'unknown'}`);
      throw new TranslationUnavailableError(error instanceof Error ? error.message : 'Unknown error');
    }
  }
}

/** Used when no provider is active and no keys are configured: the forms keep working, the English field is typed by hand. */
export class DisabledTranslator extends Translator {
  arabicToEnglish(): Promise<string> {
    return Promise.reject(new TranslationUnavailableError('No translation provider is active'));
  }
}
