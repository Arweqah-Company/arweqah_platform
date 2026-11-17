export const CSV_TYPE = 'text/csv';

/** Control bytes that never appear in text: everything below space except tab, line feed and carriage return (and the form feed Excel never writes). */
const isBinaryByte = (byte: number): boolean => byte < 0x20 && byte !== 0x09 && byte !== 0x0a && byte !== 0x0d;

/** UTF-16 files (Excel's «Unicode Text») start with a byte order mark and hold NUL bytes by design. */
const hasUtf16Mark = (body: Buffer): boolean => body.length >= 2 && ((body[0] === 0xff && body[1] === 0xfe) || (body[0] === 0xfe && body[1] === 0xff));

/**
 * A `.csv` has no magic bytes, so it is accepted by name AND by content: text without control bytes, in whatever encoding Excel saved it
 * (UTF-8 with or without a mark, Windows-1256 «ANSI» Arabic, UTF-16). A renamed binary file holds NUL or control bytes and is refused.
 * It is only ever stored and downloaded as an attachment, never shown inline.
 */
export function isCsvText(originalName: string, body: Buffer): boolean {
  if (!/\.csv$/i.test(originalName) || body.length === 0) return false;
  return hasUtf16Mark(body) || !body.some(isBinaryByte);
}
