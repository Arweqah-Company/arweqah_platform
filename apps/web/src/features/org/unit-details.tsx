import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '@/core/permissions/can';
import { Button, Tabs, ToneBadge } from '@/shared/ui';
import { DETAILS_TABS, type DetailsContext } from './details-tabs';
import { nodeName, pathOf, toneOfLevel } from './org-model';
import { ModeBadge, StatusBadges, UnitCode } from './unit-badges';

/** The path from the group down to the unit: every part above it is a button that selects that unit. */
function Breadcrumb({ ctx }: { ctx: DetailsContext }) {
  const { t, i18n } = useTranslation('org');
  const above = pathOf(ctx.model.byId, ctx.node).slice(0, -1);
  return (
    <ol aria-label={t('details.path')} className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted">
      <li>{t('chart.group')}</li>
      {above.map((n) => (
        <li key={n.id} className="flex items-center gap-1.5">
          <span aria-hidden>/</span>
          <button type="button" className="rounded text-link underline underline-offset-4" onClick={() => ctx.page.setSelectedId(n.id)}>{nodeName(n, i18n.language === 'ar')}</button>
        </li>
      ))}
    </ol>
  );
}

/** The selected unit beside the list (below it on a narrow screen): where it sits, its marks, and tabs driven by `DETAILS_TABS`. */
export function UnitDetails({ ctx }: { ctx: DetailsContext }) {
  const { t, i18n } = useTranslation('org');
  const { t: tc } = useTranslation();
  const { can } = usePermissions();
  const { node, model, page } = ctx;
  const ar = i18n.language === 'ar';
  const tabs = DETAILS_TABS.filter((tab) => !tab.permission || can(tab.permission));
  const current = tabs.find((tab) => tab.id === page.tab) ?? (tabs[0] as (typeof tabs)[number]);
  const level = model.levelById.get(node.levelId);
  return (
    <aside aria-label={t('details.label', { name: nodeName(node, ar) })} className="min-w-0 rounded-3xl border border-neutral-200 bg-white shadow-sm shadow-ink/5">
      <div className="flex flex-col gap-2 border-b border-neutral-200 p-4">
        <Breadcrumb ctx={ctx} />
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-xl font-bold leading-snug">{nodeName(node, ar)}</h2>
          <Button variant="ghost" size="icon" aria-label={tc('actions.close')} onClick={() => page.setSelectedId(null)}><X className="size-4" aria-hidden /></Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ToneBadge tone={toneOfLevel(level)}>{ar ? level?.nameAr : level?.nameEn}</ToneBadge>
          <ModeBadge node={node} />
          {node.code && <UnitCode code={node.code} />}
          <StatusBadges node={node} />
        </div>
      </div>
      <div className="p-4">
        <Tabs tabs={tabs.map((tab) => ({ id: tab.id, label: t(tab.labelKey), tour: tab.tour }))} value={current.id} label={t('details.tabs')} onChange={page.setTab} />
        <div role="tabpanel" tabIndex={0} aria-label={t(current.labelKey)} className="max-h-[36rem] overflow-auto">{current.render(ctx)}</div>
      </div>
    </aside>
  );
}
