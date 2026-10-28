import { MENTION_TOKEN } from '@arweqah-platform/shared';

export interface Mentioned {
  id: string;
  name: string;
}

export type BodyPart = { kind: 'text'; text: string } | { kind: 'mention'; id: string; name: string };

/** The text typed in the box (`@Name`) becomes the stored text (`{{mention:id}}`) for every person picked from the list who is still named. */
export function encodeMentions(text: string, picked: Mentioned[]): string {
  let out = text;
  for (const person of [...picked].sort((a, b) => b.name.length - a.name.length)) {
    out = out.split(`@${person.name}`).join(`{{mention:${person.id}}}`);
  }
  return out;
}

/** The stored text split for display: plain pieces and the people it names (an unknown id shows as a bare mention). */
export function splitBody(body: string, people: Mentioned[]): BodyPart[] {
  const parts: BodyPart[] = [];
  let last = 0;
  for (const match of body.matchAll(MENTION_TOKEN)) {
    const id = (match[1] ?? '').toLowerCase();
    if (match.index > last) parts.push({ kind: 'text', text: body.slice(last, match.index) });
    parts.push({ kind: 'mention', id, name: people.find((p) => p.id.toLowerCase() === id)?.name ?? '' });
    last = match.index + match[0].length;
  }
  if (last < body.length) parts.push({ kind: 'text', text: body.slice(last) });
  return parts;
}

/** The stored text back into what the box shows, with the people it names (for editing a comment). */
export function decodeMentions(body: string, people: Mentioned[]): string {
  return splitBody(body, people).map((p) => (p.kind === 'text' ? p.text : `@${p.name}`)).join('');
}

/** The `@word` being typed just before the caret, or null when the caret is not in one. */
export function mentionQueryAt(text: string, caret: number): { query: string; start: number } | null {
  const match = /(^|\s)@([^\s@]{0,30})$/.exec(text.slice(0, caret));
  if (!match) return null;
  const query = match[2] ?? '';
  return { query, start: caret - query.length - 1 };
}

/** Puts the chosen person in place of the `@word` being typed; returns the new text and where the caret goes. */
export function insertMention(text: string, caret: number, person: Mentioned): { text: string; caret: number } | null {
  const at = mentionQueryAt(text, caret);
  if (!at) return null;
  const inserted = `@${person.name} `;
  return { text: text.slice(0, at.start) + inserted + text.slice(caret), caret: at.start + inserted.length };
}
