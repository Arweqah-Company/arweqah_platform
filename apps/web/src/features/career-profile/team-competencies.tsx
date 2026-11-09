import { COMPETENCY_LEVELS, CorePermission, type CompetencyLevel, type CompetencyStatusDto } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { usePermissions } from '@/core/permissions/can';
import { Alert, Badge, Select } from '@/shared/ui';
import { useRecordCompetency } from './api';

/** The competencies of the member's title with the level the manager recorded for each; whoever holds the key records it in the row itself. */
export function TeamCompetencies({ employeeId, competencies }: { employeeId: string; competencies: CompetencyStatusDto[] }) {
  const { t } = useTranslation('career-profile');
  const record = useRecordCompetency(employeeId);
  const canRecord = usePermissions().can(CorePermission.CareerCompetencyRecord);
  const set = (competency: string, value: string) =>
    record.mutate({ competency, level: (value || null) as CompetencyLevel | null }, { onSuccess: () => toast.success(t('competencyRecord.saved')) });
  return (
    <div>
      <h3 className="mb-1 font-heading text-base font-bold text-fg">{t('competencyRecord.title')}</h3>
      <p className="mb-2 text-sm text-muted">{t('competencyRecord.hint')}</p>
      {record.isError && <Alert tone="danger">{t('competencyRecord.failed')}</Alert>}
      {competencies.length === 0 && <p className="text-sm text-muted">{t('competencyRecord.empty')}</p>}
      <ul className="flex flex-col gap-2">
        {competencies.map((c) => (
          <li key={c.name} className="flex flex-wrap items-center gap-2 rounded-2xl border border-neutral-200 bg-white p-3">
            <b className="min-w-0 flex-1 text-fg">{c.name}</b>
            <Badge tone="info">{t('competencyRecord.required')}: {c.required}</Badge>
            {c.met && <Badge tone="success">{t('mine.met')}</Badge>}
            {canRecord ? (
              <div className="w-40">
                <Select aria-label={`${t('competencyRecord.level')}: ${c.name}`} value={c.mine ?? ''} disabled={record.isPending} onChange={(e) => set(c.name, e.target.value)}>
                  <option value="">{t('competencyRecord.none')}</option>
                  {COMPETENCY_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </Select>
              </div>
            ) : <span className="text-sm text-muted">{c.mine ?? t('competencyRecord.none')}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
