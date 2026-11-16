/** One section of the user manual as plain text, with who may read it (the same rule as the manual: any of the keys, and the page not hidden). */
export interface ManualSection {
  id: string;
  title: string;
  permissions: string[];
  page: string | null;
  adminMode: boolean;
  text: string;
}

/** Words that say nothing about the topic of a «how do I…» question, in both languages (already normalized). */
const STOP_WORDS = new Set(['كيف', 'اعمل', 'اضيف', 'ممكن', 'عايز', 'اريد', 'ما', 'هو', 'هي', 'في', 'من', 'علي', 'الي', 'عن', 'او', 'how', 'do', 'does', 'can', 'what', 'the', 'an', 'to', 'of', 'my', 'is', 'for', 'and', 'on', 'in', 'i', 'want']);

/** Arabic spelled the way people type it: no marks or stretching, one form of alef, ya and ta marbuta, so «التذكرة» and «تذكره» are the same word. */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ً-ْـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** The words of a question worth looking for: normalized, without the article «ال», stop words and one-letter words. */
export function topicWords(question: string): string[] {
  const words = normalizeText(question).split(' ').map((w) => (w.length > 3 && w.startsWith('ال') ? w.slice(2) : w));
  return [...new Set(words.filter((w) => w.length > 1 && !STOP_WORDS.has(w)))];
}

const ARABIC = /[\u0600-\u06FF]/;

const PREFIX = /^(وال|بال|فال|كال|لل|ال|ول|و|ب|ف|ل)(?=.{3,})/;
const SUFFIX = /(ين|ون|ات|ان|ها|ه)$/;

/** What two spellings of one word share: Arabic loses a prefix (و ب ف ل), a plural or feminine ending and its long vowels («لإضافة» and «اضافه» and «تذكرة» and «تذاكر» meet), English loses a final «s». */
function stem(word: string): string {
  if (!ARABIC.test(word)) return word.length > 3 ? word.replace(/s$/, '') : word;
  const bare = word.replace(PREFIX, '');
  const ending = SUFFIX.exec(bare)?.[0] ?? '';
  const core = bare.length - ending.length >= 3 ? bare.slice(0, bare.length - ending.length) : bare;
  return core.replace(/[اويى]/g, '') || word;
}

const stems = (text: string): string[] => normalizeText(text).split(' ').filter(Boolean).map((w) => stem(w.length > 3 && w.startsWith('ال') ? w.slice(2) : w));

const TITLE_WEIGHT = 5;
const BODY_CAP = 5;

/** The items that best match a question: a word in the title counts most, then how often it is in the text (up to a few times); items with no match are left out. */
export function rankBy<T>(question: string, items: readonly T[], textsOf: (item: T) => { title: string; body: string }, limit: number): T[] {
  const words = topicWords(question).map(stem);
  return items
    .map((item) => {
      const texts = textsOf(item);
      const title = new Set(stems(texts.title));
      const body = stems(texts.body);
      const score = words.reduce((sum, w) => sum + (title.has(w) ? TITLE_WEIGHT : 0) + Math.min(body.filter((b) => b === w).length, BODY_CAP), 0);
      return { item, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.item);
}

/** The sections that best answer a question. */
export function rankSections(question: string, sections: readonly ManualSection[], limit: number): ManualSection[] {
  return rankBy(question, sections, (section) => ({ title: section.title, body: section.text }), limit);
}
