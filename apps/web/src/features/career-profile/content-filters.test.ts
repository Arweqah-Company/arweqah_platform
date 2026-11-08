import { describe, expect, it } from 'vitest';
import { toContentQuery } from './content-filters';

describe('career content filters (FR-113)', () => {
  it('names the unit filter «unit», like the list catalog, so hiding it in the list settings hides it here, and sends it as orgNodeId', () => {
    expect(toContentQuery({ unit: 'u-1' }).orgNodeId).toBe('u-1');
    expect(toContentQuery({ unit: '' }).orgNodeId).toBeUndefined();
  });
});
