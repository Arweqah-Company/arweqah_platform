import { describe, expect, it, vi } from 'vitest';
import { cropRect, drawCrop } from './crop-image';

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

  it('paints an opaque background before the picture, so a transparent PNG does not turn black in the JPEG', () => {
    const calls: string[] = [];
    const context = { fillStyle: '', fillRect: vi.fn(() => calls.push('fill')), drawImage: vi.fn(() => calls.push('draw')) };
    const canvas = { width: 0, height: 0, getContext: () => context } as unknown as HTMLCanvasElement;
    drawCrop(canvas, { width: 400, height: 200 } as unknown as CanvasImageSource & { width: number; height: number }, { zoom: 1, x: 0, y: 0 }, 128);
    expect(calls).toEqual(['fill', 'draw']);
    expect(context.fillStyle).toBe('white');
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 128, 128);
  });
});
