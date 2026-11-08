import type { MyCareerProfileDto } from '@arweqah-platform/shared';
import { Briefcase } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/shared/ui';
import { splitTitleCode } from './title-code';

/** The title code as badges: the unit's slots (sector, department, section, unit), then the grade and track. */
function CodeBadges({ code }: { code: string }) {
  const { t } = useTranslation('career-profile');
  const parts = splitTitleCode(code);
  if (!parts) return null;
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
      {parts.slots.map((s) => <Badge key={s.key}><span className="inline-flex items-center gap-1">{t(`header.slots.${s.key}`)}<bdi dir="ltr" className="font-latin">{s.value}</bdi></span></Badge>)}
      <Badge tone="info"><bdi dir="ltr" className="font-latin">{parts.gradeTrack}</bdi></Badge>
    </div>
  );
}

/** Whose path this is: the person, their title, unit and manager, the title code in parts, the development stage and the version being read. */
export function TitleHeader({ me }: { me: MyCareerProfileDto }) {
  const { t, i18n } = useTranslation('career-profile');
  const ar = i18n.language === 'ar';
  const title = ar ? me.titleNameAr : me.titleNameEn;
  const unit = (ar ? me.unitNameAr : me.unitNameEn) || me.unitNameAr;
  const line = [title, unit, me.managerName && t('header.manager', { name: me.managerName })].filter(Boolean).join(' · ');
  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center" data-tour="career-title-card">
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-petrol-800 text-cream" aria-hidden><Briefcase className="size-5" /></span>
      <div className="min-w-0 flex-1">
        <h2 className="font-heading text-lg font-bold text-fg">{me.employeeName ?? title}</h2>
        <p className="text-sm text-muted">{line}</p>
        {me.titleCode && <><bdi dir="ltr" className="font-latin text-sm text-muted">{me.titleCode}</bdi><CodeBadges code={me.titleCode} /></>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {me.stage && <Badge tone="info">{t('header.stage', { name: t(`stage.${me.stage.code}`) })}</Badge>}
        <Badge tone="info">{t('page.version', { version: me.contentVersion })}</Badge>
      </div>
    </div>
  );
}
