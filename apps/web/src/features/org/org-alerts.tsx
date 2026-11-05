import type { OrgTreeDto } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { Alert, Button } from '@/shared/ui';
import { useCompanyOptions } from './api';
import { nodeName, type OrgModel } from './org-model';
import type { OrgPageState } from './use-org-page';

const NAMED = 5;

/** The text of an alert and the button beside it. */
function Row({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return <div className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0 flex-1">{children}</div>{action}</div>;
}

/** Units and companies that have employees and nobody to lead them: the first few by name, then how many more. */
function useNoLeaderText(tree: OrgTreeDto, model: OrgModel): string {
  const { t, i18n } = useTranslation('org');
  const ar = i18n.language === 'ar';
  const companies = useCompanyOptions().data ?? [];
  const names = tree.noLeader.slice(0, NAMED).map((x) => {
    const unit = model.byId.get(x.nodeId);
    const company = companies.find((c) => c.id === x.companyId);
    return `${unit ? nodeName(unit, ar) : x.nodeId} (${company ? (ar ? company.nameAr : company.nameEn) : ''})`;
  });
  const more = tree.noLeader.length - names.length;
  return `${names.join(t('alerts.separator'))}${more > 0 ? t('alerts.noLeaderMore', { count: more }) : ''}`;
}

/** The notes above the structure: what the person is not seeing, what the comparison fades, and the units nobody leads. */
export function OrgAlerts({ page, tree, model }: { page: OrgPageState; tree: OrgTreeDto; model: OrgModel }) {
  const { t, i18n } = useTranslation('org');
  const ar = i18n.language === 'ar';
  const companies = useCompanyOptions().data ?? [];
  const companyName = (id: string | null | undefined) => { const c = companies.find((x) => x.id === id); return c ? (ar ? c.nameAr : c.nameEn) : t('alerts.yourCompany'); };
  const noLeader = useNoLeaderText(tree, model);
  const faded = model.nodes.filter((n) => n.visibleForCompany === false).length;
  return (
    <div className="mb-4 flex flex-col gap-3">
      {page.scope === 'team' && (
        <Alert tone="info">
          <Row action={page.canFull && <Button size="sm" variant="secondary" onClick={() => page.chooseScope('full')}>{t('alerts.openFull')}</Button>}>
            {t('alerts.hiddenIntro', { company: companyName(tree.companyId) })} {tree.hiddenCount > 0 ? t('alerts.hiddenCount', { count: tree.hiddenCount }) : t('alerts.noneHidden')}
            {!page.canFull && <span className="block text-muted">{t('alerts.needFull')}</span>}
          </Row>
        </Alert>
      )}
      {page.compare && <Alert tone="info">{t('alerts.compare', { company: companyName(page.compare), count: faded })}</Alert>}
      {page.scope === 'full' && tree.noLeader.length > 0 && (
        <Alert tone="warning">
          <Row action={<Button size="sm" variant="secondary" onClick={page.showWithoutLeader}>{t('alerts.showThem')}</Button>}>
            {t('alerts.noLeader', { count: tree.noLeader.length })} {noLeader}.
          </Row>
        </Alert>
      )}
    </div>
  );
}
