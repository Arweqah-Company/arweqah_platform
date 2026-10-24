import type { OrgTreeDto } from '@arweqah-platform/shared';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icicle, SearchInput, TreeChart, type ChartItem, type ChartTone } from '@/shared/ui';

const ROOT = 'root';

/** One brand color per level of the structure, in this order (a fifth level starts again). */
export const LEVEL_TONES: ChartTone[] = ['petrol', 'green', 'orange', 'neutral'];
const SWATCH: Record<ChartTone, string> = { ink: 'bg-ink', petrol: 'bg-petrol-800', green: 'bg-green-400', orange: 'bg-orange-700', neutral: 'bg-neutral-700' };

/** The company as the root card and its units below it, with the totals the reference chart shows. */
function chartItems(tree: OrgTreeDto, companyName: string, t: (key: string, options?: Record<string, unknown>) => string, ar: boolean): ChartItem[] {
  const levels = new Map(tree.levels.map((l) => [l.id, ar ? l.nameAr : l.nameEn]));
  const toneOf = (levelId: string): ChartTone => LEVEL_TONES[Math.max(0, tree.levels.findIndex((l) => l.id === levelId)) % LEVEL_TONES.length] as ChartTone;
  const employees = tree.nodes.reduce((sum, n) => sum + n.employeesCount, 0);
  const childCount = (id: string) => tree.nodes.filter((n) => n.parentId === id).length;
  return [
    { id: ROOT, parentId: null, tone: 'ink', title: companyName, badge: t('chart.company'), lines: [t('chart.counts', { units: tree.nodes.length, employees })] },
    ...tree.nodes.map((n) => ({
      id: n.id,
      parentId: n.parentId ?? ROOT,
      title: ar ? n.nameAr : n.nameEn,
      badge: levels.get(n.levelId),
      tone: toneOf(n.levelId),
      muted: !n.isActive,
      lines: [t('chart.nodeCounts', { employees: n.employeesCount, units: childCount(n.id) })],
    })),
  ];
}

interface Props {
  tree: OrgTreeDto;
  companyName: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Rows of blocks instead of a top-down tree. */
  icicle?: boolean;
}

function Picture({ icicle, ...props }: { items: ChartItem[]; selectedId: string | null; onSelect: (id: string) => void; label: string; query: string; icicle: boolean }) {
  return icicle ? <Icicle {...props} /> : <TreeChart {...props} />;
}

/** The organization chart (top-down or icicle): search, open / close all, zoom, drag; a click selects the unit. */
export function OrgChartView({ tree, companyName, selectedId, onSelect, icicle = false }: Props) {
  const { t, i18n } = useTranslation('org');
  const [query, setQuery] = useState('');
  const items = useMemo(() => chartItems(tree, companyName, t, i18n.language === 'ar'), [tree, companyName, t, i18n.language]);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput className="sm:max-w-md" aria-label={t('chart.searchLabel')} placeholder={t('chart.searchPlaceholder')} value={query} onChange={(e) => setQuery(e.target.value)} />
        <ul aria-label={t('chart.legend')} className="flex flex-wrap items-center gap-3 text-xs">
          {tree.levels.map((level, index) => (
            <li key={level.id} className="inline-flex items-center gap-1.5">
              <span className={`size-3 rounded-full ${SWATCH[LEVEL_TONES[index % LEVEL_TONES.length] as ChartTone]}`} aria-hidden />
              {i18n.language === 'ar' ? level.nameAr : level.nameEn}
            </li>
          ))}
        </ul>
      </div>
      <Picture items={items} selectedId={selectedId} onSelect={onSelect} label={t('chart.label', { company: companyName })} query={query} icicle={icicle} />
    </div>
  );
}
