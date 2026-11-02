import { describe, expect, it } from 'vitest';
import { canonicalJson, chainHash, verifyChain, type ChainedEntry } from './audit-chain';

const entry = (n: number, over: Partial<ChainedEntry> = {}): ChainedEntry => ({
  id: `00000000-0000-4000-8000-00000000000${n}`, actorId: 'u1', action: 'role.created', entityType: 'role', entityId: `r${n}`, changes: { b: 2, a: { y: 1, x: 2 } }, ip: '10.0.0.1',
  createdAt: new Date(Date.UTC(2026, 10, 2, 10, 0, n)), ...over,
});
const chain = (count: number) => {
  const rows: (ChainedEntry & { seq: string; prevHash: string | null; hash: string })[] = [];
  let previous: string | null = null;
  for (let n = 1; n <= count; n += 1) {
    const e = entry(n);
    const hash = chainHash(previous, e);
    rows.push({ ...e, seq: String(n), prevHash: previous, hash });
    previous = hash;
  }
  return rows;
};

describe('Audit hash chain (FR-75)', () => {
  it('writes the same text whatever order the keys come in', () => {
    expect(canonicalJson({ b: 1, a: [{ d: 1, c: 2 }] })).toBe(canonicalJson({ a: [{ c: 2, d: 1 }], b: 1 }));
    expect(canonicalJson({ a: undefined, b: null })).toBe('{"b":null}');
  });

  it('gives a hash that depends on the entry and on the hash before it', () => {
    const base = chainHash(null, entry(1));
    expect(base).toMatch(/^[0-9a-f]{64}$/);
    expect(chainHash(null, entry(1))).toBe(base);
    expect(chainHash('x', entry(1))).not.toBe(base);
    expect(chainHash(null, entry(1, { action: 'role.deleted' }))).not.toBe(base);
    expect(chainHash(null, entry(1, { changes: { a: { x: 2, y: 1 }, b: 2 } }))).toBe(base);
  });

  it('accepts an untouched chain, and an empty one', () => {
    expect(verifyChain(chain(4))).toEqual({ checked: 4, ok: true, brokenAtSeq: null });
    expect(verifyChain([])).toEqual({ checked: 0, ok: true, brokenAtSeq: null });
  });

  it('finds an entry that was changed, one that was removed, and one that was inserted', () => {
    const edited = chain(4);
    edited[1] = { ...(edited[1] as (typeof edited)[number]), action: 'role.deleted' };
    expect(verifyChain(edited)).toMatchObject({ ok: false, brokenAtSeq: '2' });
    const removed = chain(4).filter((r) => r.seq !== '2');
    expect(verifyChain(removed)).toMatchObject({ ok: false, brokenAtSeq: '3' });
    const forged = chain(3);
    const fake = { ...entry(9), seq: '2', prevHash: (forged[0] as (typeof forged)[number]).hash, hash: 'f'.repeat(64) };
    expect(verifyChain([forged[0] as (typeof forged)[number], fake, forged[2] as (typeof forged)[number]])).toMatchObject({ ok: false, brokenAtSeq: '2' });
  });
});
