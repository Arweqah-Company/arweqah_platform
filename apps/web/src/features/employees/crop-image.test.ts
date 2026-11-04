import { describe, expect, it } from 'vitest';
import { cropRect } from './crop-image';

describe('A square crop of a profile photo (FR-91)', () => {
  it('takes the largest centred square of a wide picture at zoom 1', () => {
    expect(cropRect(400, 200, { zoom: 1, x: 0, y: 0 })).toEqual({ side: 200, sx: 100, sy: 0 });
  });

  it('shrinks the square when zoomed in and moves it with the offsets, never outside the picture', () => {
    expect(cropRect(400, 200, { zoom: 2, x: -1, y: 1 })).toEqual({ side: 100, sx: 0, sy: 100 });
    const far = cropRect(300, 300, { zoom: 3, x: 5, y: -5 });
    expect(far.sx).toBeLessThanOrEqual(300 - far.side);
    expect(far.sy).toBeGreaterThanOrEqual(0);
  });
});
