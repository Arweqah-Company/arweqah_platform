import { Building2, Link2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/shared/ui';
import { isScheduled, type OrgNode } from './org-model';

/** How the unit is managed: shared with every company (one leader) or per company; «inherited» when nothing was set on the unit itself. */
export function ModeBadge({ node }: { node: OrgNode }) {
  const { t } = useTranslation('org');
  const shared = node.effectiveMode === 'shared';
  const Icon = shared ? Link2 : Building2;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Badge tone={shared ? 'info' : 'neutral'}><Icon className="me-1 size-3" aria-hidden />{t(shared ? 'mode.shared' : 'mode.perCompany')}</Badge>
      {node.managementMode === null && <span className="text-xs text-muted">{t('mode.inherited')}</span>}
    </span>
  );
}

/** What is notable about the unit: empty, nobody leads it for a company, not started yet, stopped; or «in force» when nothing is. */
export function StatusBadges({ node }: { node: OrgNode }) {
  const { t } = useTranslation('org');
  const marks: { key: string; tone: 'neutral' | 'warning' | 'danger' | 'info' }[] = [
    ...(!node.isActive ? [{ key: 'inactive', tone: 'neutral' as const }] : []),
    ...(node.subtreeStaffCount === 0 ? [{ key: 'empty', tone: 'warning' as const }] : []),
    ...(node.hasNoLeader ? [{ key: 'noLeader', tone: 'danger' as const }] : []),
    ...(isScheduled(node) ? [{ key: 'scheduled', tone: 'info' as const }] : []),
  ];
  if (marks.length === 0) return <Badge tone="success">{t('status.inForce')}</Badge>;
  return <span className="inline-flex flex-wrap gap-1">{marks.map((m) => <Badge key={m.key} tone={m.tone}>{t(`status.${m.key}`)}</Badge>)}</span>;
}

/** A unit code, always left to right. */
export function UnitCode({ code }: { code: string }) {
  return <bdi dir="ltr" className="font-latin tracking-wide">{code}</bdi>;
}
