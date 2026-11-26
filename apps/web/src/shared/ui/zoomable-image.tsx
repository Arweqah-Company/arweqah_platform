import { Maximize, ZoomIn, ZoomOut } from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/cn';
import { Button } from './button';

const MIN = 0.25;
const MAX = 6;
const STEP = 1.25;
const clamp = (zoom: number) => Math.min(MAX, Math.max(MIN, Math.round(zoom * 100) / 100));

/** The size the picture takes when it fits the window; zooming scales from it. */
interface Fit {
  width: number;
  height: number;
}

/** Zoom with Ctrl / Cmd + wheel (a trackpad pinch sends the same), which has to stop the page from zooming too. */
function useWheelZoom(box: React.RefObject<HTMLDivElement | null>, change: (factor: number) => void) {
  useEffect(() => {
    const node = box.current;
    if (!node) return undefined;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      change(e.deltaY < 0 ? STEP : 1 / STEP);
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [box, change]);
}

/** An attached picture that can be made bigger and smaller: buttons, + / − / 0 on the keyboard, Ctrl + wheel; a bigger picture scrolls inside its frame. */
export function ZoomableImage({ src, name }: { src: string; name: string }) {
  const { t } = useTranslation();
  const [zoom, setZoom] = useState(1);
  const [fit, setFit] = useState<Fit | null>(null);
  const [loaded, setLoaded] = useState(false); // the size of a picture is known only once it has been decoded: the buttons wait for it
  const box = useRef<HTMLDivElement>(null);
  const image = useRef<HTMLImageElement>(null);
  // At 100% the picture fits its frame by CSS, whatever the window does; its size is read at the moment zoom leaves 100%, so it is the size of the window as it is then.
  const change = (factor: number) => {
    const next = clamp(zoom * factor);
    if (!loaded) return;
    if (zoom === 1 && next !== 1 && image.current) setFit({ width: image.current.clientWidth, height: image.current.clientHeight });
    setZoom(next);
  };
  useWheelZoom(box, change);
  const onKey = (e: KeyboardEvent) => {
    if (e.key === '+' || e.key === '=') change(STEP);
    else if (e.key === '-') change(1 / STEP);
    else if (e.key === '0') setZoom(1);
  };
  const size = zoom !== 1 && fit ? { width: fit.width * zoom, height: fit.height * zoom, maxWidth: 'none', maxHeight: 'none' } : undefined;
  return (
    <div className="flex flex-col gap-2">
      <div role="group" aria-label={t('files.zoom.label')} className="flex items-center justify-center gap-2">
        <Button type="button" variant="secondary" aria-label={t('files.zoom.out')} disabled={!loaded || zoom <= MIN} onClick={() => change(1 / STEP)}><ZoomOut className="size-4" aria-hidden /></Button>
        <span role="status" className="min-w-14 text-center text-sm tabular-nums" dir="ltr">{Math.round(zoom * 100)}%</span>
        <Button type="button" variant="secondary" aria-label={t('files.zoom.in')} disabled={!loaded || zoom >= MAX} onClick={() => change(STEP)}><ZoomIn className="size-4" aria-hidden /></Button>
        <Button type="button" variant="secondary" aria-label={t('files.zoom.fit')} disabled={zoom === 1} onClick={() => setZoom(1)}><Maximize className="size-4" aria-hidden /></Button>
      </div>
      {/* a scrolling frame is reached by keyboard, so its picture can be scrolled and zoomed without a mouse */}
      <div ref={box} tabIndex={0} role="region" aria-label={name} onKeyDown={onKey} className="max-h-[60vh] overflow-auto rounded-xl border border-neutral-200 bg-neutral-50 p-1">
        <img ref={image} src={src} alt={name} draggable={false} style={size} onLoad={() => setLoaded(true)} className={cn('mx-auto block', zoom === 1 && 'max-h-[56vh] max-w-full object-contain')} />
      </div>
    </div>
  );
}
