import { describe, expect, it } from 'vitest';
import { randomPrefix } from './factories/unit-prefix';

describe('Prefixes of the root units made by the test factories (CodeRabbit, PR 52)', () => {
  it('never repeat, so two root units in one test cannot answer 409 ORG_CODE_TAKEN by chance', () => {
    const prefixes = Array.from({ length: 2000 }, () => randomPrefix());
    expect(new Set(prefixes).size).toBe(prefixes.length);
    for (const prefix of prefixes) expect(prefix).toMatch(/^[A-Z]{3}$/);
  });
});
