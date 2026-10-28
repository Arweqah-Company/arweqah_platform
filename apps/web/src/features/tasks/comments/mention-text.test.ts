import { describe, expect, it } from 'vitest';
import { decodeMentions, encodeMentions, insertMention, mentionQueryAt, splitBody } from './mention-text';

const SARA = { id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301', name: 'سارة أحمد' };
const SAMI = { id: '4f2504e0-4f89-41d3-9a0c-0305e82c3302', name: 'سارة' };

describe('Mentions in a comment (FR-66)', () => {
  it('stores a picked name as its token, the longest name first so a shorter one does not eat it', () => {
    expect(encodeMentions('مرحبا @سارة أحمد و @سارة', [SAMI, SARA])).toBe(`مرحبا {{mention:${SARA.id}}} و {{mention:${SAMI.id}}}`);
    expect(encodeMentions('بريد a@b.com', [SARA])).toBe('بريد a@b.com');
  });

  it('splits the stored text for display and decodes it back for editing', () => {
    const body = `نص {{mention:${SARA.id}}} ونص`;
    expect(splitBody(body, [SARA])).toEqual([{ kind: 'text', text: 'نص ' }, { kind: 'mention', id: SARA.id, name: SARA.name }, { kind: 'text', text: ' ونص' }]);
    expect(decodeMentions(body, [SARA])).toBe('نص @سارة أحمد ونص');
    expect(splitBody('بلا ذكر', [])).toEqual([{ kind: 'text', text: 'بلا ذكر' }]);
  });

  it('finds the @word being typed at the caret, only at a word start', () => {
    expect(mentionQueryAt('hi @sa', 6)).toEqual({ query: 'sa', start: 3 });
    expect(mentionQueryAt('@', 1)).toEqual({ query: '', start: 0 });
    expect(mentionQueryAt('mail a@b', 8)).toBeNull();
    expect(mentionQueryAt('hi @sa ', 7)).toBeNull();
  });

  it('puts the chosen person in place of the word typed', () => {
    expect(insertMention('hi @sa and more', 6, SARA)).toEqual({ text: 'hi @سارة أحمد  and more', caret: 3 + 1 + SARA.name.length + 1 });
    expect(insertMention('no mention', 4, SARA)).toBeNull();
  });
});
