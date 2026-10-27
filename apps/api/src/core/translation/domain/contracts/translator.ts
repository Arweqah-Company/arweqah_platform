/** Port to a machine-translation service. Arabic to English is the only direction the forms need. */
export abstract class Translator {
  abstract arabicToEnglish(text: string): Promise<string>;
}
