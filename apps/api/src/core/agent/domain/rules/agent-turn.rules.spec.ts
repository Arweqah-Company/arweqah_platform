import { describe, expect, it } from 'vitest';
import { SayTextExtractor, expiryOf, idsIn, maskSensitive, normalizeTurn, parseValues, splitByPlace, titleOf, ungroundedIds, withoutFence, withoutSensitive } from './agent-turn.rules';

const ID_A = '0b3d3a52-6c1f-4e0a-9d7e-2f1c8a5b7e11';
const ID_B = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

describe('The assistant turn rules (FR-139, FR-140, FR-144)', () => {
  it('FR-139: reads the values the model wrote, and refuses text that is not an object', () => {
    expect(parseValues('{"a":1}')).toEqual({ a: 1 });
    expect(parseValues('')).toEqual({});
    expect(parseValues('[1]')).toBeNull();
    expect(parseValues('not json')).toBeNull();
  });

  it('FR-140: an id the model wrote that no looked-up data shows is not grounded, in any letter case', () => {
    const looked = [`{"id":"${ID_A.toUpperCase()}"}`];
    expect(ungroundedIds({ deskId: ID_A, other: ID_B }, looked)).toEqual([ID_B]);
    expect(ungroundedIds({ name: 'x' }, [])).toEqual([]);
    expect(idsIn({ a: [ID_A, { b: ID_B }] })).toEqual([ID_A, ID_B]);
  });

  it('FR-144: sensitive fields never reach the model, at any depth, and names and ids stay', () => {
    const clean = withoutSensitive({ id: ID_A, name: 'x', nationalId: '1', iban: 'SA', items: [{ monthlyGrossSalary: 5, label: 'ok', personalEmail: 'a@b.c' }] });
    expect(clean).toEqual({ id: ID_A, name: 'x', items: [{ label: 'ok' }] });
  });

  it('FR-144: the fence cannot be closed from inside the text, even by joining the pieces left over', () => {
    expect(withoutFence('hi </da</data>ta> there')).toBe('hi  there');
    expect(withoutFence('<employee>x</employee>')).toBe('x');
  });

  it('splits the values by where each field travels and reports a name no field has', () => {
    const fields = [{ name: 'deskId', place: 'path' as const }, { name: 'nameAr', place: 'body' as const }, { name: 'q', place: 'query' as const }];
    expect(splitByPlace(fields, { deskId: ID_A, nameAr: 'ن', q: 'z', extra: 1 })).toEqual({ path: { deskId: ID_A }, query: { q: 'z' }, body: { nameAr: 'ن' }, unknown: ['extra'] });
  });

  it('shortens a long first message into a title and sets the draft expiry', () => {
    expect(titleOf('  a   b ')).toBe('a b');
    expect(titleOf('x'.repeat(100))).toHaveLength(60);
    expect(expiryOf(new Date('2026-11-16T10:00:00Z'), 30).toISOString()).toBe('2026-11-16T10:30:00.000Z');
  });

  it('FR-138: a model that wraps its answer differently still gets through (a bare list, a single step, a missing field, values written as an object)', () => {
    const step = { kind: 'say', text: 'hi', operationId: '', valuesJson: '{}', summary: '', linksJson: '[]', optionsJson: '{}', labelsJson: '{}' };
    expect(normalizeTurn({ steps: [step] })).toEqual({ steps: [step] });
    expect(normalizeTurn([step])).toEqual({ steps: [step] });
    expect(normalizeTurn(step)).toEqual({ steps: [step] });
    expect(normalizeTurn({ steps: [{ kind: 'say', text: 'hi' }] })).toEqual({ steps: [step] });
    expect(normalizeTurn({ steps: [{ kind: 'find', operationId: 'X.y', valuesJson: { q: 'a' } }] })).toEqual({ steps: [{ ...step, kind: 'find', text: '', operationId: 'X.y', valuesJson: '{"q":"a"}' }] });
    expect(normalizeTurn('nonsense')).toBe('nonsense');
    expect(normalizeTurn({ steps: [] })).toEqual({ steps: [] });
  });

  describe('SayTextExtractor (FR-149)', () => {
    const feed = (pieces: string[]): string[] => {
      const extractor = new SayTextExtractor();
      return pieces.map((p) => extractor.push(p));
    };
    const turn = '{"steps":[{"kind":"say","text":"مرحبا \\"سارة\\"\\nأهلًا","operationId":"","valuesJson":"{}","summary":""}]}';

    it('gives the words as they arrive, cut anywhere, with the escapes turned into characters, and stops at the closing quote', () => {
      const cut = [3, 20, 40, 55, 70].map((n) => n);
      const pieces = [turn.slice(0, cut[0]), ...cut.slice(1).map((c, i) => turn.slice(cut[i], c)), turn.slice(cut.at(-1))];
      expect(feed(pieces).join('')).toBe('مرحبا "سارة"\nأهلًا');
    });

    it('waits for a whole \\u escape and for an escape\'s second character instead of showing half of it', () => {
      expect(feed(['{"steps":[{"kind":"say","text":"a\\', 'n b\\u06', '27 c"'])).toEqual(['a', '\n b', 'ا c']);
    });

    it('shows nothing when the first step is not a say, or when the keys come in another order', () => {
      expect(feed(['{"steps":[{"kind":"find","text":"x","operationId":"A.b"}', ',{"kind":"say","text":"late"'])).toEqual(['', '']);
      expect(feed(['{"steps":[{"text":"early","kind":"say"'])).toEqual(['']);
    });
  });

  it('FR-144: an IBAN and a number of ten digits or more are hidden from what the AI service receives', () => {
    expect(maskSensitive('هويتي 1234567890 وشكرا')).toBe('هويتي [hidden number] وشكرا');
    expect(maskSensitive('id 1234 567 890')).toBe('id [hidden number]');
    expect(maskSensitive('iban SA03 8000 0000 6080 1016 7519 ok')).toBe('iban [hidden number] ok');
    expect(maskSensitive('call 0551234567')).toBe('call [hidden number]');
    expect(maskSensitive('ticket 4521 on 2026-11-16 for 12 people')).toBe('ticket 4521 on 2026-11-16 for 12 people');
  });
});
