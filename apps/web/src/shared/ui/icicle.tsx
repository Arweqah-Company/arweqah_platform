import { Maximize2, Minus, Plus } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { childrenOf, descendantCount } from '../lib/chart-tree';
import { cn } from '../lib/cn';
import { partitionLayout, type PartitionSlice } from '../lib/partition-layout';
import { useOpenNodes } from '../lib/use-open-nodes';
import { FILL, ON_FILL } from './chart-tones';
import type { ChartItem } from './tree-chart';

/** Width of a level (a column) and height of a line (one leaf), in drawing units: room for a whole name and a second line. */
const COLUMN = 250;
const LINE = 60;
const GAP = 3;
const LETTER = 7;
const PADDING = 44;
/** Zoom steps, as the share of the natural size. */
const ZOOMS = [0.4, 0.5, 0.75, 1, 1.25];
const NATURAL = ZOOMS.indexOf(1);

const BAR_BUTTON = 'grid h-9 min-w-9 place-items-center rounded-lg px-2 text-xs text-fg transition-colors hover:bg-neutral-50 disabled:opacity-40';

/** The name cut with an ellipsis to what fits the block (a column is wide enough for most names whole). */
export function fitLabel(title: string, width: number): string {
  const room = Math.floor((width - PADDING) / LETTER);
  if (room < 3) return '';
  return title.length <= room ? title : `${title.slice(0, room - 1)}…`;
}

interface Geometry {
  x: number;
  y: number;
  height: number;
}

interface BlockProps {
  item: ChartItem;
  box: Geometry;
  isRoot: boolean;
  selected: boolean;
  hit: boolean;
  onSelect: (id: string) => void;
}

/** Dimmed (stopped, or only the way to a match) or faded (not visible to the compared company). */
const fadeClass = (item: ChartItem): string => (item.muted || item.dimmed ? 'opacity-50' : item.faded ? 'opacity-60' : '');

function Block({ item, box, isRoot, selected, hit, onSelect }: BlockProps) {
  const tone = item.tone ?? 'neutral';
  const middle = box.y + box.height / 2;
  const press = isRoot ? {} : {
    role: 'button', tabIndex: 0, 'aria-pressed': selected, 'aria-label': [item.title, item.badge].filter(Boolean).join(' — '),
    onClick: () => onSelect(item.id),
    onKeyDown: (e: React.KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSelect(item.id)),
  };
  return (
    <g {...press} className={cn(!isRoot && 'cursor-pointer outline-none focus-visible:[&>rect]:stroke-link', fadeClass(item))}>
      <title>{item.title}</title>
      <rect x={box.x + GAP / 2} y={box.y + GAP / 2} width={COLUMN - GAP} height={box.height - GAP} rx={10} className={cn(FILL[tone], 'stroke-white stroke-2', item.faded && '[stroke-dasharray:6_4]', (selected || hit) && 'stroke-yellow-300 [stroke-width:5px]')} />
      <text x={box.x + COLUMN / 2} y={middle - 8} textAnchor="middle" dominantBaseline="middle" className={cn(ON_FILL[tone], 'pointer-events-none text-[13px] font-bold')}>{fitLabel(item.title, COLUMN)}</text>
      <text x={box.x + COLUMN / 2} y={middle + 11} textAnchor="middle" dominantBaseline="middle" className={cn(ON_FILL[tone], 'pointer-events-none text-[11px]')}>{[item.badge, item.lines?.[0]].filter(Boolean).join(' · ')}</text>
    </g>
  );
}

/** The round open / close button on the side of a block that faces its children. */
function Toggle({ item, box, count, open, mirrored, onToggle }: { item: ChartItem; box: Geometry; count: number; open: boolean; mirrored: boolean; onToggle: (id: string) => void }) {
  const { t } = useTranslation();
  const cx = mirrored ? box.x + 17 : box.x + COLUMN - 17;
  const cy = box.y + box.height / 2;
  const act = () => onToggle(item.id);
  return (
    <g role="button" tabIndex={0} aria-expanded={open} aria-label={t(open ? 'chart.collapse' : 'chart.expand', { title: item.title, count })} className="cursor-pointer outline-none focus-visible:[&>circle]:stroke-link" onClick={act} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), act())}>
      <circle cx={cx} cy={cy} r={11} className="fill-white stroke-ink stroke-1" />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" className="fill-ink pointer-events-none text-[16px] font-bold">{open ? '−' : '+'}</text>
    </g>
  );
}

/** Where a slice sits in the drawing: a level is a column (the root's on the start side), a unit's share of the leaves is its height. */
function place(slice: PartitionSlice, levels: number, leaves: number, mirrored: boolean): Geometry {
  const column = mirrored ? levels - 1 - slice.depth : slice.depth;
  return { x: column * COLUMN, y: slice.from * leaves * LINE, height: (slice.to - slice.from) * leaves * LINE };
}

/** The units that can be seen: the root, and the units under every open node. */
function visibleItems(items: ChartItem[], rootId: string, isOpen: (id: string) => boolean): ChartItem[] {
  const out: ChartItem[] = [];
  const walk = (item: ChartItem) => {
    out.push(item);
    if (isOpen(item.id)) childrenOf(items, item.id).forEach(walk);
  };
  walk(items.find((i) => i.id === rootId) as ChartItem);
  return out;
}

interface IcicleProps {
  items: ChartItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  label: string;
  query?: string;
  /** How many levels start open (the root is level 0); the default opens everything. */
  openDepth?: number;
}

/**
 * A horizontal icicle: the root is a block on the start side, each level a column after it, each unit a block next to its
 * parent whose height is the number of units below it. Every name is written whole on a line of its own; any block with units
 * under it opens and closes, and the buttons open all, close all, fit and zoom.
 */
export function Icicle({ items, selectedId, onSelect, label, query = '', openDepth = Number.POSITIVE_INFINITY }: IcicleProps) {
  const { t, i18n } = useTranslation();
  const mirrored = i18n.language === 'ar';
  const rootId = (items.find((i) => i.parentId === null) as ChartItem).id;
  const nodes = useOpenNodes(items, rootId, query, openDepth);
  const [zoom, setZoom] = useState(NATURAL);
  const box = useRef<HTMLDivElement>(null);
  const shown = useMemo(() => visibleItems(items, rootId, nodes.isOpen), [items, rootId, nodes.isOpen]);
  const layout = useMemo(() => partitionLayout(shown), [shown]);
  const byId = new Map(items.map((i) => [i.id, i]));
  const width = layout.levels * COLUMN;
  const height = layout.leaves * LINE;
  const fit = () => {
    const room = (box.current?.clientWidth ?? width) - 16;
    setZoom(Math.max(0, ZOOMS.findLastIndex((z) => z * width <= room)));
  };
  return (
    <div className="rounded-3xl border border-neutral-200 bg-white">
      <div className="flex flex-wrap items-center justify-end gap-1 border-b border-neutral-200 p-2">
        <button type="button" onClick={nodes.openAll} className={BAR_BUTTON}>{t('chart.openAll')}</button>
        <button type="button" onClick={nodes.closeAll} className={BAR_BUTTON}>{t('chart.closeAll')}</button>
        <button type="button" aria-label={t('chart.fit')} title={t('chart.fit')} onClick={fit} className={BAR_BUTTON}><Maximize2 className="size-4" aria-hidden /></button>
        <button type="button" aria-label={t('chart.zoomIn')} title={t('chart.zoomIn')} disabled={zoom === ZOOMS.length - 1} onClick={() => setZoom(zoom + 1)} className={BAR_BUTTON}><Plus className="size-4" aria-hidden /></button>
        <button type="button" aria-label={t('chart.zoomOut')} title={t('chart.zoomOut')} disabled={zoom === 0} onClick={() => setZoom(zoom - 1)} className={BAR_BUTTON}><Minus className="size-4" aria-hidden /></button>
      </div>
      <div ref={box} className="overflow-auto p-2" tabIndex={0} role="region" aria-label={label} dir="ltr">
        <svg viewBox={`0 0 ${width} ${height}`} width={width * (ZOOMS[zoom] as number)} height={height * (ZOOMS[zoom] as number)} className="max-w-none" role="group" aria-label={label}>
          {layout.slices.map((slice) => {
            const item = byId.get(slice.id) as ChartItem;
            const geometry = place(slice, layout.levels, layout.leaves, mirrored);
            const below = childrenOf(items, item.id).length;
            return (
              <g key={slice.id}>
                <Block item={item} box={geometry} isRoot={slice.id === rootId} selected={slice.id === selectedId} hit={nodes.hits.has(slice.id)} onSelect={onSelect} />
                {below > 0 && <Toggle item={item} box={geometry} count={descendantCount(items, item.id)} open={nodes.isOpen(slice.id)} mirrored={mirrored} onToggle={nodes.toggle} />}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
