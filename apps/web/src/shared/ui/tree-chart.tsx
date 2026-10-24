import { ChevronDown, ChevronUp, Maximize2, Minus, Plus } from 'lucide-react';
import { useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { childrenOf, descendantCount } from '../lib/chart-tree';
import { cn } from '../lib/cn';
import { useOpenNodes } from '../lib/use-open-nodes';

export interface ChartItem {
  id: string;
  /** Null for the root; the first level of the chart has the root's id. */
  parentId: string | null;
  title: string;
  /** A small pill above the title, e.g. the level name. */
  badge?: string;
  /** Short lines under the title, e.g. counts. */
  lines?: string[];
  /** Shown dimmed (inactive). */
  muted?: boolean;
  /** The brand color of the card (a level of the structure gets one tone, the root is `ink`). */
  tone?: ChartTone;
}

export type ChartTone = 'ink' | 'petrol' | 'green' | 'orange' | 'neutral';

/** Brand colors per tone: card, its badge and the selected ring. Text stays dark or cream for contrast. */
const TONES: Record<ChartTone, { card: string; badge: string; solid: boolean }> = {
  ink: { card: 'border-ink bg-ink text-cream', badge: 'border-cream/50 text-cream', solid: true },
  petrol: { card: 'border-link bg-petrol-50 text-fg', badge: 'border-link bg-petrol-800 text-cream', solid: false },
  green: { card: 'border-green-400 bg-green-50 text-fg', badge: 'border-green-400 bg-green-400 text-ink', solid: false },
  orange: { card: 'border-orange-500 bg-orange-50 text-fg', badge: 'border-orange-700 bg-orange-700 text-cream', solid: false },
  neutral: { card: 'border-neutral-500 bg-white text-fg', badge: 'border-ink bg-ink text-cream', solid: false },
};

interface TreeChartProps {
  items: ChartItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Accessible name of the chart. */
  label: string;
  /** Nodes whose title contains this text are highlighted and their ancestors opened. */
  query?: string;
}

/** Zoom steps and their classes, written out so Tailwind keeps them. */
const ZOOMS = [
  { value: 0.2, className: 'scale-[0.2]' },
  { value: 0.3, className: 'scale-[0.3]' },
  { value: 0.4, className: 'scale-[0.4]' },
  { value: 0.5, className: 'scale-50' },
  { value: 0.6, className: 'scale-[0.6]' },
  { value: 0.75, className: 'scale-75' },
  { value: 0.9, className: 'scale-90' },
  { value: 1, className: 'scale-100' },
  { value: 1.25, className: 'scale-125' },
];
const DEFAULT_ZOOM = ZOOMS.findIndex((z) => z.value === 0.75);
/** How many levels start open. */
const OPEN_DEPTH = 2;

interface NodeProps {
  item: ChartItem;
  items: ChartItem[];
  isRoot: boolean;
  selected: boolean;
  hit: boolean;
  open: boolean;
  rtl: boolean;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
}

function cardClasses({ tone, isRoot, selected, hit, muted }: { tone: ChartTone; isRoot: boolean; selected: boolean; hit: boolean; muted?: boolean }): string {
  return cn(
    'flex w-52 flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-3.5 text-center shadow-sm shadow-ink/5 transition-[box-shadow,transform] duration-150 hover:shadow-md',
    TONES[tone].card,
    isRoot && 'cursor-default',
    selected && 'ring-4 ring-ink/25',
    hit && !selected && 'ring-4 ring-yellow-300',
    muted && 'opacity-60',
  );
}

function OpenToggle({ item, count, open, onToggle }: { item: ChartItem; count: number; open: boolean; onToggle: (id: string) => void }) {
  const { t } = useTranslation();
  const Icon = open ? ChevronUp : ChevronDown;
  return (
    <button type="button" aria-expanded={open} aria-label={t(open ? 'chart.collapse' : 'chart.expand', { title: item.title, count })} onClick={() => onToggle(item.id)} className="-mt-2.5 grid size-5 place-items-center rounded-full bg-petrol-800 text-cream ring-2 ring-white transition-transform hover:scale-110">
      <Icon className="size-3" aria-hidden />
    </button>
  );
}

function ChartNode({ item, items, isRoot, selected, hit, open, rtl, onSelect, onToggle }: NodeProps) {
  const hasKids = childrenOf(items, item.id).length > 0;
  return (
    <div className="relative flex flex-col items-center">
      <button type="button" dir={rtl ? 'rtl' : 'ltr'} aria-pressed={isRoot ? undefined : selected} onClick={() => !isRoot && onSelect(item.id)} className={cardClasses({ tone: item.tone ?? 'neutral', isRoot, selected, hit, muted: item.muted })}>
        {item.badge && <span className={cn('rounded-full border px-2.5 py-0.5 text-xs font-medium', TONES[item.tone ?? 'neutral'].badge)}>{item.badge}</span>}
        <span className="line-clamp-2 text-sm font-bold leading-snug">{item.title}</span>
        {item.lines?.map((line) => <span key={line} className={cn('text-xs', TONES[item.tone ?? 'neutral'].solid ? 'text-cream/85' : 'text-fg/75')}>{line}</span>)}
      </button>
      {hasKids && <OpenToggle item={item} count={descendantCount(items, item.id)} open={open} onToggle={onToggle} />}
    </div>
  );
}

const BAR_BUTTON = 'grid h-8 min-w-8 place-items-center rounded-lg px-2 text-xs text-fg hover:bg-neutral-50 disabled:opacity-40';

/** Largest zoom step at which the whole chart fits the box (width and height), never below the smallest step. */
function fitZoom(box: HTMLElement, content: HTMLElement): number {
  const ratio = Math.min((box.clientWidth - 48) / Math.max(1, content.offsetWidth), (box.clientHeight - 96) / Math.max(1, content.offsetHeight));
  return Math.max(0, ZOOMS.findLastIndex((z) => z.value <= ratio));
}

/**
 * An organization-style chart of a tree: cards joined by lines, each node can be opened or closed, the whole chart
 * zooms, fits the screen and can be dragged. Drawn with HTML and CSS only (see `.org-chart` in theme.css), so it prints and selects like text.
 */
export function TreeChart({ items, selectedId, onSelect, label, query = '' }: TreeChartProps) {
  const { t, i18n } = useTranslation();
  const rtl = i18n.language === 'ar';
  const root = items.find((i) => i.parentId === null) as ChartItem;
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const viewport = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const { hits, isOpen, toggle, openAll: openNodes, closeAll: closeNodes } = useOpenNodes(items, root.id, query, OPEN_DEPTH);

  /** Picks the zoom that shows everything and scrolls to the middle (the chart is centered on the box). */
  const fit = () => {
    const box = viewport.current;
    const inner = content.current;
    if (!box || !inner) return;
    setZoom(fitZoom(box, inner));
    box.scrollTo({ left: Math.max(0, (inner.offsetWidth - box.clientWidth) / 2), top: 0 });
  };
  // The new layout exists after the next paint, so measure then (two frames: state applied, then drawn).
  const afterLayout = () => requestAnimationFrame(() => requestAnimationFrame(fit));
  const openAll = () => { openNodes(); afterLayout(); };
  const closeAll = () => { closeNodes(); afterLayout(); };

  const down = (e: PointerEvent<HTMLDivElement>) => {
    const box = viewport.current;
    if (!box || (e.target as HTMLElement).closest('button')) return;
    drag.current = { x: e.clientX, y: e.clientY, left: box.scrollLeft, top: box.scrollTop };
    box.setPointerCapture(e.pointerId);
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const box = viewport.current;
    if (!d || !box) return;
    box.scrollLeft = d.left - (e.clientX - d.x);
    box.scrollTop = d.top - (e.clientY - d.y);
  };

  const renderNode = (item: ChartItem): ReactNode => {
    const kids = childrenOf(items, item.id);
    const shown = isOpen(item.id) ? (rtl ? [...kids].reverse() : kids) : [];
    return (
      <li key={item.id}>
        <ChartNode item={item} items={items} isRoot={item.id === root.id} selected={item.id === selectedId} hit={hits.has(item.id)} open={isOpen(item.id)} rtl={rtl} onSelect={onSelect} onToggle={toggle} />
        {shown.length > 0 && <ul>{shown.map(renderNode)}</ul>}
      </li>
    );
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-neutral-200 bg-neutral-50">
      <div className="absolute start-4 top-4 z-10 flex flex-wrap items-center gap-1 rounded-xl border border-neutral-200 bg-white p-1 shadow-sm" dir={rtl ? 'rtl' : 'ltr'}>
        <button type="button" onClick={openAll} className={BAR_BUTTON}>{t('chart.openAll')}</button>
        <button type="button" onClick={closeAll} className={BAR_BUTTON}>{t('chart.closeAll')}</button>
        <span className="mx-1 h-5 w-px bg-neutral-200" aria-hidden />
        <button type="button" aria-label={t('chart.fit')} title={t('chart.fit')} onClick={fit} className={BAR_BUTTON}><Maximize2 className="size-4" aria-hidden /></button>
        <button type="button" aria-label={t('chart.zoomIn')} disabled={zoom === ZOOMS.length - 1} onClick={() => setZoom(zoom + 1)} className={BAR_BUTTON}><Plus className="size-4" aria-hidden /></button>
        <span className="min-w-12 text-center text-xs text-muted" dir="ltr" aria-live="polite">{Math.round((ZOOMS[zoom]?.value ?? 1) * 100)}%</span>
        <button type="button" aria-label={t('chart.zoomOut')} disabled={zoom === 0} onClick={() => setZoom(zoom - 1)} className={BAR_BUTTON}><Minus className="size-4" aria-hidden /></button>
      </div>
      <div ref={viewport} dir="ltr" role="group" aria-label={label} tabIndex={0} onPointerDown={down} onPointerMove={move} onPointerUp={() => { drag.current = null; }} className="h-[34rem] cursor-grab overflow-auto px-6 pb-8 pt-20 active:cursor-grabbing">
        <div ref={content} className={cn('org-chart mx-auto w-max origin-top transition-transform duration-150', ZOOMS[zoom]?.className)}>
          <ul>{renderNode(root)}</ul>
        </div>
      </div>
    </div>
  );
}
