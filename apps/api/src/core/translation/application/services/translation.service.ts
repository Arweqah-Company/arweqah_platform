import { Injectable } from '@nestjs/common';
import type { TranslationDto } from '@arweqah-platform/shared';
import { RateWindow } from '../../../../common/application/rate-window';
import { Translator } from '../../domain/contracts/translator';
import { TranslationRateLimitedError } from '../../domain/errors/translation.errors';
import { RATE_WINDOW_MS, TRANSLATIONS_PER_MINUTE } from '../messages/translation.messages';

const ARABIC_LETTER = /\p{Script=Arabic}/u;

/** Translates what a person types in Arabic so the English field can be filled for them. */
@Injectable()
export class TranslationService {
  private readonly window = new RateWindow(TRANSLATIONS_PER_MINUTE, RATE_WINDOW_MS);

  constructor(private readonly translator: Translator) {}

  async toEnglish(userId: string, text: string): Promise<TranslationDto> {
    // Text with no Arabic letters (numbers, Latin names) is already what the English field needs: no call, no cost.
    if (!ARABIC_LETTER.test(text)) return { text };
    if (!this.window.take(userId)) throw new TranslationRateLimitedError();
    return { text: (await this.translator.arabicToEnglish(text)).trim() };
  }
}
