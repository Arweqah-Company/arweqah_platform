import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { cn } from '../lib/cn';
import type { SplitPart } from './progress-split';

/** One slice of a donut or one bar: same brand `fill-*` tokens as `ProgressSplit`, so both themes work and colour is never the only carrier of meaning. */
export type ChartPart = SplitPart;

function Legend({ parts }: { parts: ChartPart[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {parts.map((p) => (
        <li key={p.key} className="flex items-center gap-1.5">
          <svg aria-hidden viewBox="0 0 4 4" className="size-2.5 rounded-sm"><rect width={4} height={4} className={p.fill} /></svg>
          <span>{p.label}</span>
          <span className="font-bold text-fg" dir="ltr">{p.value}</span>
        </li>
      ))}
    </ul>
  );
}

/** A chart with its title, its picture (`role="img"` + label), the legend in words and counts, and a text for «nothing to show». */
function ChartFrame({ title, label, parts, empty, className, children }: { title: string; label: string; parts: ChartPart[]; empty: string; className?: string; children: React.ReactNode }) {
  const hasData = parts.some((p) => p.value > 0);
  return (
    <figure className={cn('flex flex-col gap-3 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm shadow-ink/5', className)}>
      <figcaption className="text-base font-bold">{title}</figcaption>
      {hasData ? (
        <>
          <div role="img" aria-label={label} className="h-44 w-full" dir="ltr">{children}</div>
          <Legend parts={parts} />
        </>
      ) : (
        <p className="py-6 text-sm text-muted">{empty}</p>
      )}
    </figure>
  );
}

export interface ChartProps {
  title: string;
  label: string;
  parts: ChartPart[];
  empty: string;
  className?: string;
}

/** Share of a whole by part (status of tasks, of tickets). */
export function DonutChart(props: ChartProps) {
  const data = props.parts.filter((p) => p.value > 0);
  return (
    <ChartFrame {...props}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 176 }}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="label" innerRadius="60%" outerRadius="90%" paddingAngle={2} stroke="none" isAnimationActive={false}>
            {data.map((p) => <Cell key={p.key} className={p.fill} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

/** Comparison of a few counts side by side. */
export function BarsChart(props: ChartProps) {
  return (
    <ChartFrame {...props}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 176 }}>
        <BarChart data={props.parts} margin={{ top: 16, right: 8, bottom: 0, left: 8 }}>
          <XAxis dataKey="label" tickLine={false} axisLine={false} interval={0} tick={{ className: 'fill-muted text-xs' }} />
          <YAxis hide domain={[0, 'dataMax']} />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} isAnimationActive={false} label={{ position: 'top', className: 'fill-fg text-xs font-bold' }}>
            {props.parts.map((p) => <Cell key={p.key} className={p.fill} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
