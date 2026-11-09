/** How many texts to show a person: the rest would only be noise. */
export const UNGROUNDED_MAX = 25;
/** A text shorter than this is a code and is not worth checking against the file (a three-letter name such as «جيد» is). */
const GROUNDING_MIN_CHARS = 3;
/** Numbers, levels and ranges (95, 109.9, 60/40, 125%) are not worth checking, whatever their length. */
const NUMERIC = /^[\d\s.,%/+\-–·]+$/;

/** The stretching mark and the invisible direction marks that a word processor leaves inside a text. */
function withoutMarks(value: string): string {
  const ignored = (code: number): boolean => code === 0x640 || (code >= 0x200b && code <= 0x200f) || (code >= 0x202a && code <= 0x202e);
  return [...value].filter((char) => !ignored(char.codePointAt(0) ?? 0)).join('');
}

/** Whitespace, final punctuation and the stretching mark do not count as a difference between what a file says and what the AI copied. */
export const normalText = (value: string): string => withoutMarks(value).replace(/\s+/g, ' ').replace(/[.،؛:]+$/g, '').trim();

/** The texts the AI returned that are not in the source word for word (each once, at most `UNGROUNDED_MAX`): the places where it did not copy, for the reviewer to look at first. */
export function ungroundedTexts(texts: readonly string[], source: string): string[] {
  const haystack = normalText(source);
  const missing = texts.map(normalText).filter((t) => t.length >= GROUNDING_MIN_CHARS && !NUMERIC.test(t) && !haystack.includes(t));
  return [...new Set(missing)].slice(0, UNGROUNDED_MAX);
}
