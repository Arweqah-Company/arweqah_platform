import { Translator } from '../../src/core/translation/domain/contracts/translator';

/** Answers "EN: <text>" instead of calling Amazon Translate; CI never reaches AWS. */
export class FakeTranslator extends Translator {
  readonly calls: string[] = [];

  async arabicToEnglish(text: string): Promise<string> {
    this.calls.push(text);
    return `EN: ${text}`;
  }
}
