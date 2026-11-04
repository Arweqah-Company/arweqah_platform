/** The size of the square picture that is uploaded (a profile photo needs no more). */
export const PHOTO_SIZE = 512;

export interface CropView {
  /** 1 = the whole short side fits; larger zooms in. */
  zoom: number;
  /** The picture's centre, from -1 (left / top) to 1 (right / bottom) within what the zoom leaves free. */
  x: number;
  y: number;
}

/** The source rectangle of a square crop: the largest square of the image, shrunk by the zoom and moved by the offsets, always inside the image. */
export function cropRect(width: number, height: number, view: CropView): { sx: number; sy: number; side: number } {
  const side = Math.min(width, height) / Math.max(1, view.zoom);
  const sx = (width - side) / 2 + (view.x * (width - side)) / 2;
  const sy = (height - side) / 2 + (view.y * (height - side)) / 2;
  return { side, sx: Math.min(Math.max(sx, 0), width - side), sy: Math.min(Math.max(sy, 0), height - side) };
}

/** Draws the chosen square of the picture into `canvas` (the preview and the final file use the same drawing). */
export function drawCrop(canvas: HTMLCanvasElement, image: CanvasImageSource & { width: number; height: number }, view: CropView, size: number): void {
  const context = canvas.getContext('2d');
  if (!context) return;
  const { sx, sy, side } = cropRect(image.width, image.height, view);
  canvas.width = size;
  canvas.height = size;
  // A JPEG has no transparency: a transparent PNG would turn black, so the picture is drawn on white (the preview and the file look the same).
  context.fillStyle = 'white';
  context.fillRect(0, 0, size, size);
  context.drawImage(image, sx, sy, side, side, 0, 0, size, size);
}

/** The cropped square as a JPEG file of at most `PHOTO_SIZE` pixels a side. */
export function cropToFile(image: CanvasImageSource & { width: number; height: number }, view: CropView, name: string): Promise<File> {
  const canvas = document.createElement('canvas');
  drawCrop(canvas, image, view, PHOTO_SIZE);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(new File([blob], `${name.replace(/\.[^.]+$/, '') || 'photo'}.jpg`, { type: 'image/jpeg' })) : reject(new Error('The picture could not be prepared'))), 'image/jpeg', 0.9);
  });
}
