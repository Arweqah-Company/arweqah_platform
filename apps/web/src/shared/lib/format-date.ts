/** A day written out in the language of the screen, «15 أبريل 2026» or «15 April 2026» (Gregorian calendar, Latin digits). `iso` is YYYY-MM-DD. */
export function formatLongDate(iso: string, language: string): string {
  const locale = language.startsWith('ar') ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-GB-u-ca-gregory';
  return new Date(`${iso}T00:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
}
