import { CorePermission, LEARNING_PRIORITIES, type CareerContent, type LearningRecordDto } from '@arweqah-platform/shared';
import { Eye, ExternalLink, GraduationCap, Plus, Upload } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Can } from '@/core/permissions/can';
import { ExchangeButtons } from '@/shared/data-exchange/exchange-buttons';
import { useListPage } from '@/shared/lib/use-list-page';
import { Badge, Button, DataTable, DetailsDialog, EmptyState, ListToolbar, RowAction, type Column } from '@/shared/ui';
import { useMyLearning } from './api';
import { formatMinutes } from './format-minutes';
import { filterUnits, learningExportColumns, learningFilterFields, type LearningRow } from './learning-list';
import { ProofDialog } from './proof-dialog';
import { RequestDialog } from './request-dialog';
import { byUnit, STATE_TONE, stateOf } from './proof-status';

const PRIORITY_TONE: Record<LearningRow['priority'], 'danger' | 'warning' | 'info'> = { [LEARNING_PRIORITIES[0]]: 'danger', [LEARNING_PRIORITIES[1]]: 'warning', [LEARNING_PRIORITIES[2]]: 'info' };

function openLink(link: string): void {
  window.open(link, '_blank', 'noopener,noreferrer');
}

type Shown = { kind: 'proof' | 'details'; unit: LearningRow } | null;

/** The facts of a unit and of its proof, for a row with no page of its own. */
function UnitDetails({ unit, record, onClose }: { unit: LearningRow; record?: LearningRecordDto; onClose: () => void }) {
  const { t } = useTranslation('career-profile');
  const day = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString() : null);
  return (
    <DetailsDialog
      title={unit.title}
      description={unit.period}
      onClose={onClose}
      rows={[
        [t('learning.columns.priority'), unit.priority], [t('learning.columns.provider'), unit.provider], [t('learning.columns.duration'), unit.duration], [t('learning.columns.language'), unit.language],
        [t('learning.columns.state'), t(`proof.state.${stateOf(record)}`)], [t('proof.kind'), record ? t(`proof.kinds.${record.kind}.title`) : null], [t('proof.submittedAt'), day(record?.submittedAt)],
        [t('proof.file'), record?.fileName], [t('proof.note'), record?.note], [t('proof.rejectedBecauseLabel'), record?.status === 'rej' ? record.rejectionReason : null],
      ]}
    />
  );
}

/** The state of a unit as a badge, with how many times its proof was rejected. */
function StateBadge({ record }: { record?: LearningRecordDto }) {
  const { t } = useTranslation('career-profile');
  const state = stateOf(record);
  return <Badge tone={STATE_TONE[state]}>{t(`proof.state.${state}`)}{record && record.rejectionCount > 0 && state === 'rej' ? ` (${record.rejectionCount})` : ''}</Badge>;
}

/** Every action on a unit's row, each with its key: open the link, the details, send (or send again) a proof. */
function UnitActions({ unit, preview, onShow }: { unit: LearningRow; preview: boolean; onShow: (shown: Shown) => void }) {
  const { t } = useTranslation('career-profile');
  const sendable = !preview && !!unit.id && (unit.state === 'todo' || unit.state === 'rej');
  return (
    <>
      {unit.link && <RowAction label={`${t('learning.openLink')}: ${unit.title}`} icon={ExternalLink} onClick={() => openLink(unit.link)} />}
      {!preview && <RowAction label={`${t('proof.details')}: ${unit.title}`} icon={Eye} onClick={() => onShow({ kind: 'details', unit })} />}
      {sendable && (
        <Can permission={CorePermission.CareerLearningUpload}><RowAction label={`${t(unit.state === 'rej' ? 'proof.again' : 'proof.upload')}: ${unit.title}`} icon={Upload} onClick={() => onShow({ kind: 'proof', unit })} /></Can>
      )}
    </>
  );
}

/** The columns of the units: the state of my proof only on my own page (never in the preview). */
function useUnitColumns(preview: boolean, records: Map<string, LearningRecordDto>): Column<LearningRow>[] {
  const { t } = useTranslation('career-profile');
  const state: Column<LearningRow>[] = preview ? [] : [{ id: 'state', header: t('learning.columns.state'), cell: (u) => <StateBadge record={u.id ? records.get(u.id) : undefined} /> }];
  return [
    { id: 'priority', header: t('learning.columns.priority'), cell: (u) => <Badge tone={PRIORITY_TONE[u.priority]}>{u.priority}</Badge> },
    { id: 'unit', header: t('learning.columns.unit'), cell: (u) => <span><b className="font-medium">{u.title}</b>{u.provider && <span className="block text-sm text-muted">{u.provider}</span>}</span> },
    { id: 'duration', header: t('learning.columns.duration'), cell: (u) => u.duration },
    { id: 'language', header: t('learning.columns.language'), cell: (u) => u.language },
    ...state,
    { id: 'link', header: t('learning.columns.link'), cell: (u) => (u.link ? <a className="font-medium text-link underline" href={u.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>{t('learning.openLink')}</a> : <span className="text-muted">{t('learning.noLink')}</span>) },
  ];
}

/** The units of a period with the state of my proof on each (none in the preview: nobody's progress). */
function unitRows(period: CareerContent['learning']['periods'][number] | undefined, preview: boolean, records: Map<string, LearningRecordDto>): LearningRow[] {
  return (period?.units ?? []).map((u) => ({ ...u, period: period?.name ?? '', state: preview ? undefined : stateOf(u.id ? records.get(u.id) : undefined) }));
}

/** The dialog of the row the person opened: the unit's facts, or the form to send a proof. */
function UnitDialogs({ shown, records, onClose }: { shown: Shown; records: Map<string, LearningRecordDto>; onClose: () => void }) {
  if (!shown) return null;
  const { unit } = shown;
  const record = unit.id ? records.get(unit.id) : undefined;
  if (shown.kind === 'details') return <UnitDetails unit={unit} record={record} onClose={onClose} />;
  return unit.id ? <ProofDialog unitId={unit.id} unitTitle={unit.title} record={record} onClose={onClose} /> : null;
}

/** The units of one period as a list: search by name or provider, filters (priority, language, and the state of my proof), table or cards, export; a click opens the unit's details. */
export function LearningUnits({ period, preview }: { period: CareerContent['learning']['periods'][number] | undefined; preview: boolean }) {
  const { t } = useTranslation('career-profile');
  const list = useListPage('career-learning');
  const records = byUnit(useMyLearning(!preview).data);
  const [shown, setShown] = useState<Shown>(null);
  const [requesting, setRequesting] = useState(false);
  const all = unitRows(period, preview, records);
  const rows = filterUnits(all, list.term, list.filters.values);
  const columns = useUnitColumns(preview, records);
  const exchange = preview ? undefined : (
    <>
      <ExchangeButtons permissions={{ export: CorePermission.CareerLearningExport }} exporting={{ columns: learningExportColumns(t, true), filename: 'career-learning', pageRows: rows, total: rows.length, loadAll: async () => rows }} />
      <Can permission={CorePermission.CareerRequestsCreate}><Button variant="secondary" onClick={() => setRequesting(true)}><Plus className="size-4" aria-hidden />{t('requests.open')}</Button></Can>
    </>
  );
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted">{t('learning.periodTotal', { count: all.length, duration: formatMinutes(all.reduce((sum, u) => sum + u.minutes, 0), t) })}</p>
      <DataTable<LearningRow>
        listKey="career-learning"
        caption={t('learning.units')}
        view={list.view}
        rows={rows}
        rowKey={(u) => u.id ?? u.title}
        onRowClick={preview ? undefined : (u) => setShown({ kind: 'details', unit: u })}
        toolbar={<ListToolbar listKey="career-learning" {...list.toolbar({ label: t('learning.searchLabel'), placeholder: t('learning.searchPlaceholder') }, learningFilterFields(t, all, !preview))} actions={exchange} />}
        actions={(u) => <UnitActions unit={u} preview={preview} onShow={setShown} />}
        empty={<EmptyState icon={GraduationCap} title={t('learning.noMatches')} />}
        columns={columns}
      />
      <UnitDialogs shown={shown} records={records} onClose={() => setShown(null)} />
      {requesting && <RequestDialog onClose={() => setRequesting(false)} />}
    </div>
  );
}
