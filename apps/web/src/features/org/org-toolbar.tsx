import type { OrgTreeDto } from '@arweqah-platform/shared';
import { AlignStartVertical, LayoutGrid, Network, Table2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCompanyOptions } from './api';
import { ListToolbar, ListToolbarPanel, SegmentedControl, Select, ToneBadge, type FilterField, type ViewChoice } from '@/shared/ui';
import { toneOfLevel, type OrgModel } from './org-model';
import { OrgExport } from './org-table-view';
import type { OrgPageState, OrgView } from './use-org-page';

/** A filter for every attribute a person could narrow the structure by (the ids are the list catalog's). */
function useOrgFilterFields(tree: OrgTreeDto): FilterField[] {
  const { t, i18n } = useTranslation('org');
  const ar = i18n.language === 'ar';
  const yesNo = (withText: string, withoutText: string) => [{ value: 'with', label: withText }, { value: 'without', label: withoutText }];
  return [
    { id: 'level', label: t('table.type'), type: 'select', options: tree.levels.map((l) => ({ value: l.id, label: ar ? l.nameAr : l.nameEn })) },
    { id: 'mode', label: t('table.mode'), type: 'select', options: [{ value: 'shared', label: t('mode.shared') }, { value: 'per_company', label: t('mode.perCompany') }] },
    { id: 'status', label: t('table.status'), type: 'select', options: ['empty', 'noleader', 'inactive', 'active'].map((value) => ({ value, label: t(`filter.status.${value}`) })) },
    { id: 'employees', label: t('filter.employees'), type: 'select', options: yesNo(t('filter.withEmployees'), t('filter.withoutEmployees')) },
    { id: 'manager', label: t('filter.manager'), type: 'select', options: yesNo(t('filter.withManager'), t('filter.withoutManager')) },
  ];
}

/** The two controls only a holder of «see the full structure» has: the full view, and «show me company X». */
function FullViewControls({ page }: { page: OrgPageState }) {
  const { t, i18n } = useTranslation('org');
  const companies = useCompanyOptions().data ?? [];
  return (
    <>
      <SegmentedControl tour="org-scope" label={t('scope.label')} value={page.scope} onChange={page.chooseScope} choices={[{ id: 'team', label: t('scope.team') }, { id: 'full', label: t('scope.full') }]} />
      {page.scope === 'full' && (
        <div className="flex items-center gap-2">
          <label htmlFor="org-as-company" className="text-sm text-muted">{t('scope.asCompany')}</label>
          <Select id="org-as-company" className="w-52" value={page.asCompany} onChange={(e) => page.setAsCompany(e.target.value)}>
            <option value="">{t('scope.allCompanies')}</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{i18n.language === 'ar' ? c.nameAr : c.nameEn}</option>)}
          </Select>
        </div>
      )}
    </>
  );
}

/** Colours of the types of unit, each with its name: the colour never carries the meaning alone. */
function Legend({ tree }: { tree: OrgTreeDto }) {
  const { t, i18n } = useTranslation('org');
  return (
    <div className="flex basis-full flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
      <ul aria-label={t('legend.label')} className="flex flex-wrap items-center gap-2">
        {tree.levels.map((l) => <li key={l.id}><ToneBadge tone={toneOfLevel(l)}>{i18n.language === 'ar' ? l.nameAr : l.nameEn}</ToneBadge></li>)}
      </ul>
      <span>{t('legend.note')}</span>
    </div>
  );
}

/** Search, every filter, who sees what (full view holders), export, the four views and the legend of the colours. */
export function OrgToolbar({ page, tree, model }: { page: OrgPageState; tree: OrgTreeDto; model: OrgModel }) {
  const { t } = useTranslation('org');
  const { t: tc } = useTranslation();
  const fields = useOrgFilterFields(tree);
  const views: ViewChoice<OrgView>[] = [{ id: 'chart', label: tc('view.chart'), icon: Network }, { id: 'icicle', label: tc('view.icicle'), icon: AlignStartVertical }, { id: 'table', label: tc('view.table'), icon: Table2 }, { id: 'cards', label: tc('view.cards'), icon: LayoutGrid }];
  const actions = <>{page.canFull && <FullViewControls page={page} />}<OrgExport model={model} /></>;
  return (
    <ListToolbarPanel>
      <ListToolbar listKey="org" {...page.list.toolbar({ label: t('search.label'), placeholder: t('search.placeholder') }, fields, false)} actions={actions} view={{ value: page.view, onChange: page.setView as (mode: never) => void, choices: views as ViewChoice[] }} />
      <Legend tree={tree} />
    </ListToolbarPanel>
  );
}
