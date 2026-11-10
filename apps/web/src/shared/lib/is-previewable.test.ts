import { describe, expect, it } from 'vitest';
import { isPreviewable, previewKindOf } from '@arweqah-platform/shared';

describe('isPreviewable (FR-128)', () => {
  it('accepts images and PDF, with a charset or capitals, and nothing that can carry script', () => {
    expect(isPreviewable('image/png')).toBe(true);
    expect(previewKindOf('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('docx');
    expect(previewKindOf('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')).toBe('xlsx');
    expect(isPreviewable('Application/PDF; charset=binary')).toBe(true);
    for (const type of ['image/svg+xml', 'text/html', 'application/msword', '']) expect(isPreviewable(type)).toBe(false);
  });
});
