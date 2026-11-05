import type { TFunction } from 'i18next';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Icicle, TreeChart, type ChartItem } from '@/shared/ui';
import { nodeName, toneOfLevel, type OrgModel } from './org-model';

const ROOT = 'root';
/** The group as the root card and the units below it, coloured by their type, with the counts the page shows. */
function chartItems(model: OrgModel, t: TFunction, ar: boolean): ChartItem[] {
  const modeLabel = (mode: string) => t(mode === 'shared' ? 'mode.shared' : 'mode.perCompany');
  const kids = (id: string) => model.nodes.filter((n) => n.parentId === id).length;
  return [
    { id: ROOT, parentId: null, tone: 'ink', title: t('chart.group'), badge: t('chart.groupBadge'), lines: [t('chart.rootCounts', { units: model.nodes.length, employees: model.total })] },
    ...model.nodes.map((n) => ({
      id: n.id,
      parentId: n.parentId && model.byId.has(n.parentId) ? n.parentId : ROOT,
      title: nodeName(n, ar),
      badge: ar ? model.levelById.get(n.levelId)?.nameAr : model.levelById.get(n.levelId)?.nameEn,
      tone: toneOfLevel(model.levelById.get(n.levelId)),
      muted: !n.isActive,
      faded: n.visibleForCompany === false,
      dimmed: model.filtering && !model.matching.has(n.id),
      searchText: [n.nameAr, n.nameEn, n.code ?? '', ...n.titles.flatMap((x) => [x.nameAr, x.nameEn])].join(' '),
      lines: [t('chart.nodeCounts', { employees: model.counts.get(n.id) ?? 0, units: kids(n.id), mode: modeLabel(n.effectiveMode) }), n.code ?? t('table.noCode')],
    })),
  ];
}

interface Props {
  model: OrgModel;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Blocks in columns instead of a top-down tree. */
  icicle: boolean;
  /** The search box's text: the chart opens the way to a match and rings it. */
  query: string;
}

/** The organization chart (top-down or icicle): open / close all, fit, zoom, drag; a click selects the unit. */
export function OrgChartView({ model, selectedId, onSelect, icicle, query }: Props) {
  const { t, i18n } = useTranslation('org');
  const ar = i18n.language === 'ar';
  const items = useMemo(() => chartItems(model, t, ar), [model, t, ar]);
  const props = { items, selectedId, onSelect, label: t('chart.label'), query };
  // The chart starts with the group open only (a unit opens with its round button); the icicle starts fully open, as the design system says.
  return icicle ? <Icicle {...props} /> : <TreeChart {...props} openDepth={1} />;
}
