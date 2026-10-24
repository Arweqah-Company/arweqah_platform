import { cn } from '../lib/cn';

export interface SplitPart {
  key: string;
  label: string;
  value: number;
  /** The fill of its part of the bar; the legend carries the words and the counts, so colour never carries the meaning alone. */
  fill: 'fill-petrol-800' | 'fill-green-400' | 'fill-orange-500' | 'fill-neutral-500';
}

/** How a total divides into parts: one bar and a legend with every part's name and count. */
export function ProgressSplit({ parts, label, className }: { parts: SplitPart[]; label: string; className?: string }) {
  const total = parts.reduce((sum, p) => sum + p.value, 0);
  let offset = 0;
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <svg role="img" aria-label={label} viewBox="0 0 100 4" preserveAspectRatio="none" className="h-3 w-full overflow-hidden rounded-full bg-neutral-50">
        {total > 0 &&
          parts.map((p) => {
            const width = (p.value / total) * 100;
            const x = offset;
            offset += width;
            return width > 0 ? <rect key={p.key} x={x} y={0} width={width} height={4} className={p.fill} /> : null;
          })}
      </svg>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {parts.map((p) => (
          <li key={p.key} className="flex items-center gap-1.5">
            <svg aria-hidden viewBox="0 0 4 4" className="size-2.5 rounded-sm"><rect width={4} height={4} className={p.fill} /></svg>
            <span>{p.label}</span>
            <span className="font-bold text-fg" dir="ltr">{p.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
