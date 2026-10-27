import { describe, expect, it } from 'vitest';
import { parseSender } from './sender-address';

describe('sender address', () => {
  it('splits a name and an address', () => {
    expect(parseSender('Arweqah Platform <no-reply@arweqah.sa>')).toEqual({ name: 'Arweqah Platform', email: 'no-reply@arweqah.sa' });
    expect(parseSender('"Arweqah, Platform" <a@b.sa>')).toEqual({ name: 'Arweqah, Platform', email: 'a@b.sa' });
  });

  it('accepts a bare address', () => {
    expect(parseSender(' a@b.sa ')).toEqual({ name: null, email: 'a@b.sa' });
  });
});
