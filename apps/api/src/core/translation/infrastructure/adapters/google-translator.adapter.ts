import { v2 } from '@google-cloud/translate';
import { Logger } from '@nestjs/common';
import { Translator } from '../../domain/contracts/translator';
import { TranslationUnavailableError } from '../../domain/errors/translation.errors';

/** Google Cloud Translation (basic edition), signed in with a service account key file. */
export class GoogleTranslator extends Translator {
  private readonly logger = new Logger(GoogleTranslator.name);
  private readonly client: v2.Translate;

  constructor(serviceAccountJson: string) {
    super();
    const account = JSON.parse(serviceAccountJson) as { project_id?: string; client_email: string; private_key: string };
    this.client = new v2.Translate({ projectId: account.project_id, credentials: { client_email: account.client_email, private_key: account.private_key } });
  }

  async arabicToEnglish(text: string): Promise<string> {
    try {
      const [translated] = await this.client.translate(text, { from: 'ar', to: 'en', format: 'text' });
      if (!translated) throw new Error('Empty answer');
      return translated;
    } catch (error) {
      this.logger.error(`Google Translate failed: ${error instanceof Error ? error.name : 'unknown'}`);
      throw new TranslationUnavailableError(error instanceof Error ? error.message : 'Unknown error');
    }
  }
}
