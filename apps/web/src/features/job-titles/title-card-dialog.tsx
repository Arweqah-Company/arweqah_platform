import { CorePermission, type JobTitleCardDto } from '@arweqah-platform/shared';
import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Can, usePermissions } from '@/core/permissions/can';
import { pickLines } from '@/shared/lib/lines';
import { Alert, Badge, Button, Dialog, FormField, LineList, Select } from '@/shared/ui';
import { useTitleCard } from './api';
import { CodeBreakdown } from './code-breakdown';
import { ManagerChain } from './manager-chain';
import { TitleContentDialog } from './title-content-dialog';

const heading = 'mb-2 text-sm font-bold';

/** The development stage with its hours and budget, or why there is none (no rule yet: «HR decides»). */
function StageText({ card }: { card: JobTitleCardDto }) {
  const { t, i18n } = useTranslation('job-titles');
  const stage = card.developmentStage;
  if (!stage) return <span className="text-muted">{t(card.developmentStageReason === 'no_grade' ? 'card.stageNoGrade' : 'card.stageNoRule')}</span>;
  const money = new Intl.NumberFormat(i18n.language === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US').format(stage.budgetCap);
  return <>{t('card.stageText', { stage: t(`card.stage.${stage.code}`), hours: stage.hoursPerYear, budget: money })}</>;
}

function Facts({ card }: { card: JobTitleCardDto }) {
  const { t, i18n } = useTranslation('job-titles');
  const ar = i18n.language === 'ar';
  const reportsTo = card.reportsTo;
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
      <dt className="text-muted">{t('titles.grade')}</dt><dd>{card.grade ? <span dir="ltr">L{card.grade}</span> : '—'}</dd>
      <dt className="text-muted">{t('titles.track')}</dt><dd>{card.track ? t(`titles.tracks.${card.track}`) : '—'}</dd>
      <dt className="text-muted">{t('card.stageLabel')}</dt><dd><StageText card={card} /></dd>
      <dt className="text-muted">{t('titles.reportsTo')}</dt><dd>{reportsTo ? <>{(ar ? reportsTo.nameAr : reportsTo.nameEn) || reportsTo.nameAr}{reportsTo.code && <span className="text-muted"> · <bdi dir="ltr" className="font-latin">{reportsTo.code}</bdi></span>}</> : '—'}</dd>
    </dl>
  );
}

function ContentSection({ card, onEdit }: { card: JobTitleCardDto; onEdit: () => void }) {
  const { t, i18n } = useTranslation('job-titles');
  const ar = i18n.language === 'ar';
  const blocks = [
    { id: 'responsibilities', lines: pickLines(card.responsibilities, ar) },
    { id: 'qualifications', lines: pickLines(card.qualifications, ar) },
    { id: 'kpis', lines: pickLines(card.kpis, ar) },
  ];
  const empty = blocks.every((b) => b.lines.length === 0);
  return (
    <section aria-labelledby="card-content" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="card-content" className="text-sm font-bold">{t('card.content')}</h3>
        <Can adminMode permission={CorePermission.OrgTitlesEditContent}><Button size="sm" variant="secondary" onClick={onEdit}><Pencil className="size-4" aria-hidden />{t('card.editContent')}</Button></Can>
      </div>
      {empty ? <p className="rounded-2xl border border-dashed border-neutral-500 px-4 py-3 text-sm text-muted">{t('card.contentEmpty')}</p> : blocks.map((b) => b.lines.length > 0 && <div key={b.id}><h4 className="mb-1 text-xs font-medium text-muted">{t(`card.${b.id}`)}</h4><LineList items={b.lines} /></div>)}
    </section>
  );
}

function Occupants({ card }: { card: JobTitleCardDto }) {
  const { t, i18n } = useTranslation('job-titles');
  if (card.occupants.length === 0) return <Badge tone="warning">{t('titles.vacant')}</Badge>;
  return (
    <ul className="flex flex-wrap gap-2">
      {card.occupants.map((o) => <li key={o.companyId}><Badge>{i18n.language === 'ar' ? o.companyNameAr : o.companyNameEn}: <b dir="ltr" className="ms-1">{o.count}</b></Badge></li>)}
    </ul>
  );
}

/** The company the manager chain is walked for: the companies that have holders (another company than one's own needs the full-view key). */
function CompanyChoice({ card, value, onChange }: { card: JobTitleCardDto; value: string; onChange: (id: string) => void }) {
  const { t, i18n } = useTranslation('job-titles');
  return (
    <div className="max-w-xs">
      <FormField label={t('chain.company')}>
        {(p) => (
          <Select {...p} value={value} onChange={(e) => onChange(e.target.value)}>
            {card.occupants.map((o) => <option key={o.companyId} value={o.companyId}>{`${i18n.language === 'ar' ? o.companyNameAr : o.companyNameEn} (${o.count})`}</option>)}
          </Select>
        )}
      </FormField>
    </div>
  );
}

function CardBody({ card, company, onCompany }: { card: JobTitleCardDto; company: string | undefined; onCompany: (id: string) => void }) {
  const { t, i18n } = useTranslation('job-titles');
  const canChoose = usePermissions().can(CorePermission.OrgViewFull) && card.occupants.length > 1;
  const [editing, setEditing] = useState(false);
  const chosen = card.chain?.companyId ?? company ?? '';
  const occupant = card.occupants.find((o) => o.companyId === chosen);
  const companyName = occupant ? (i18n.language === 'ar' ? occupant.companyNameAr : occupant.companyNameEn) : '';
  return (
    <div className="flex flex-col gap-6">
      {card.codeParts ? <section><h3 className={heading}>{t('card.codeMeaning')}</h3><CodeBreakdown parts={card.codeParts} /></section> : <Alert tone="info">{t('card.noCode')}</Alert>}
      <Facts card={card} />
      <ContentSection card={card} onEdit={() => setEditing(true)} />
      <section><h3 className={heading}>{t('card.occupants')}</h3><Occupants card={card} /></section>
      <section aria-labelledby="card-chain">
        <h3 id="card-chain" className={heading}>{t('chain.title')}</h3>
        <p className="mb-3 text-sm text-muted">{t('chain.rule')}</p>
        {canChoose && <CompanyChoice card={card} value={chosen} onChange={onCompany} />}
        <ManagerChain card={card} companyName={companyName} />
      </section>
      {editing && <TitleContentDialog card={card} onClose={() => setEditing(false)} />}
    </div>
  );
}

/** The card of a job title: what its code means, grade, track and development stage, its content, who holds it, and who the direct manager is. */
export function TitleCardDialog({ titleId, onClose }: { titleId: string; onClose: () => void }) {
  const { t, i18n } = useTranslation('job-titles');
  const { t: tc } = useTranslation();
  const [company, setCompany] = useState<string | undefined>(undefined);
  const card = useTitleCard(titleId, company);
  const ar = i18n.language === 'ar';
  const data = card.data;
  const title = data ? ((ar ? data.nameAr : data.nameEn) || data.nameAr) : t('card.loading');
  const where = data ? `${ar ? data.unit.pathAr : data.unit.pathEn}${data.code ? ` · ${data.code}` : ''}` : undefined;
  return (
    <Dialog open xl onOpenChange={(open) => !open && onClose()} title={title} description={where}>
      <div>
        {card.isError && <Alert>{tc('errors.generic')}</Alert>}
        {card.isPending && <p role="status" className="text-sm text-muted">{t('card.loading')}</p>}
        {data && <CardBody card={data} company={company} onCompany={setCompany} />}
      </div>
    </Dialog>
  );
}
