export const CSV_TYPE = 'text/csv';

const decoder = new TextDecoder('utf-8', { fatal: true });

/**
 * A `.csv` has no magic bytes, so it is accepted by name AND by content: valid UTF-8 text without a NUL byte (a renamed binary file has one or fails to decode).
 * It is only ever stored and downloaded as an attachment, never shown inline.
 */
export function isCsvText(originalName: string, body: Buffer): boolean {
  if (!/\.csv$/i.test(originalName) || body.includes(0)) return false;
  try {
    decoder.decode(body);
    return true;
  } catch {
    return false;
  }
}
