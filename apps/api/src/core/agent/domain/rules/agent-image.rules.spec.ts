import { describe, expect, it } from 'vitest';
import { fileCapOf, foreignFileIds, latestImages, messageText, withoutFileIds } from './agent-image.rules';

const file = (id: string) => ({ id, name: `${id}.png`, contentType: 'image/png', size: 1 });

describe('Pictures of the assistant chat (FR-180)', () => {
  it('FR-180: the model reads how many pictures came with a message, and a message of pictures only is still a line', () => {
    expect(messageText('see', 2)).toBe('see\n[2 pictures attached]');
    expect(messageText('see', 1)).toBe('see\n[1 picture attached]');
    expect(messageText('see', 0)).toBe('see');
    expect(messageText('', 1)).toBe('[1 picture attached]');
    expect(messageText('', 0)).toBe('(no text)');
  });

  it('FR-180: the pictures shown are those of the newest message that has any, at most three', () => {
    expect(latestImages([{ files: [file('a')] }, { files: [] }])).toEqual([file('a')]);
    expect(latestImages([{ files: [file('a')] }, { files: [file('b'), file('c'), file('d'), file('e')] }]).map((f) => f.id)).toEqual(['b', 'c', 'd']);
    expect(latestImages([{ files: [] }])).toEqual([]);
  });

  it('FR-180: an action takes pictures only if it has a fileIds field, and no more than its schema allows', () => {
    expect(fileCapOf([{ name: 'title', schema: {} }])).toBeNull();
    expect(fileCapOf([{ name: 'fileIds', schema: { type: 'array', maxItems: 5 } }])).toBe(5);
    expect(fileCapOf([{ name: 'fileIds', schema: { type: 'array' } }])).toBe(3);
  });

  it('FR-180: what the model wrote in fileIds is dropped, and a ticked picture the card did not offer is found', () => {
    expect(withoutFileIds({ title: 't', fileIds: ['x'] })).toEqual({ title: 't' });
    expect(foreignFileIds(['a', 'z'], [file('a'), file('b')])).toEqual(['z']);
    expect(foreignFileIds([], [file('a')])).toEqual([]);
  });
});
