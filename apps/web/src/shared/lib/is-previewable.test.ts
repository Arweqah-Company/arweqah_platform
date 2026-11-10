import { describe, expect, it } from 'vitest';
import { isPreviewable } from '@arweqah-platform/shared';

describe('isPreviewable (FR-128)', () => {
  it('accepts images and PDF, with a charset or capitals, and nothing that can carry script', () => {
    expect(isPreviewable('image/png')).toBe(true);
    expect(isPreviewable('Application/PDF; charset=binary')).toBe(true);
    for (const type of ['image/svg+xml', 'text/html', 'application/msword', '']) expect(isPreviewable(type)).toBe(false);
  });
});
