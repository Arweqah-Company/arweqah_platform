import { CorePermission, PROOF_REASON_MIN, type TeamMemberDetailDto, type TeamMemberDto, type TeamWaitingProofDto } from '@arweqah-platform/shared';
import { Check, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Can } from '@/core/permissions/can';
import { Alert, Badge, Button, Dialog, FormField, Input } from '@/shared/ui';
import { useTeamDecision, useTeamMember } from './api';
import { formatMinutes } from './format-minutes';
import { TeamCompetencies } from './team-competencies';

/** One number of the member: a label, the figure and, where it has one, a bar. */
function Figure({ label, value, ratio }: { label: string; value: string; ratio?: number }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
      <span className="text-sm text-muted">{label}</span>
      <b className="text-xl tabular-nums text-fg">{value}</b>
      {ratio !== undefined && <progress className="h-2.5 w-full accent-petrol-800" value={Math.round(ratio * 100)} max={100} aria-label={label} />}
    </div>
  );
}

/** The manager's two ways to decide: approve, or reject with a reason (at least five characters). */
function Decision({ employeeId, proofId }: { employeeId: string; proofId: string }) {
  const { t } = useTranslation('career-profile');
  const { approve, reject } = useTeamDecision(employeeId, proofId);
  const [reason, setReason] = useState<string | null>(null);
  const short = (reason ?? '').trim().length < PROOF_REASON_MIN;
  return (
    <Can permission={CorePermission.CareerTeamDecide}>
      {(approve.isError || reject.isError) && <Alert tone="danger">{t('certs.failed')}</Alert>}
      {reason === null ? (
        <div className="flex gap-2">
          <Button size="sm" disabled={approve.isPending} onClick={() => approve.mutate(undefined, { onSuccess: () => toast.success(t('certs.approved')) })}><Check className="size-4" aria-hidden />{t('certs.approve')}</Button>
          <Button size="sm" variant="danger" onClick={() => setReason('')}><X className="size-4" aria-hidden />{t('certs.reject.action')}</Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-end gap-2">
          <FormField label={t('certs.reject.reason')} error={reason && short ? t('certs.reject.short') : undefined}>{(p) => <Input {...p} value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />}</FormField>
          <Button size="sm" variant="danger" disabled={short || reject.isPending} onClick={() => reject.mutate(reason.trim(), { onSuccess: () => toast.success(t('certs.reject.done')) })}>{t('certs.reject.confirm')}</Button>
        </div>
      )}
    </Can>
  );
}

/** A proof waiting for a decision; only one referred to the manager can be decided here. */
function ReferredProof({ employeeId, proof }: { employeeId: string; proof: TeamWaitingProofDto }) {
  const { t } = useTranslation('career-profile');
  return (
    <li className="flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-3">
      <div className="flex flex-wrap items-center gap-2"><b>{proof.unitTitle}</b><Badge tone="info">{t(`proof.kinds.${proof.kind}.title`)}</Badge><Badge tone={proof.status === 'referred' ? 'info' : 'warning'}>{t(`proof.state.${proof.status}`)}</Badge></div>
      {proof.note && <p className="text-sm text-muted">{proof.note}</p>}
      {proof.status === 'referred' && <Decision employeeId={employeeId} proofId={proof.id} />}
    </li>
  );
}

/** The three numbers of the member. */
function MemberFigures({ data }: { data: TeamMemberDetailDto }) {
  const { t } = useTranslation('career-profile');
  const year = data.yearMinutes;
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Figure label={t('team.required')} value={t('tiles.unitsValue', { done: data.requiredDone, total: data.requiredTotal })} ratio={data.requiredTotal ? data.requiredDone / data.requiredTotal : 0} />
      <Figure label={t('team.hours')} value={year ? `${formatMinutes(data.approvedMinutes, t)} / ${formatMinutes(year, t)}` : formatMinutes(data.approvedMinutes, t)} ratio={year ? data.approvedMinutes / year : undefined} />
      <Figure label={t('team.overdue')} value={String(data.overdue)} />
    </div>
  );
}

/** The proofs waiting for a decision. */
function WaitingProofs({ data, loaded, failed }: { data: TeamMemberDetailDto; loaded: boolean; failed: boolean }) {
  const { t } = useTranslation('career-profile');
  return (
    <div><h3 className="mb-2 font-heading text-base font-bold text-fg">{t('team.waitingProofs')}</h3>
      {failed && <Alert tone="danger">{t('team.loadFailed')}</Alert>}
      {loaded && data.proofs.length === 0 && <p className="text-sm text-muted">{t('team.noProofs')}</p>}
      <ul className="flex flex-col gap-2">{data.proofs.map((p) => <ReferredProof key={p.id} employeeId={data.employeeId} proof={p} />)}</ul>
    </div>
  );
}

/** The window of a member: three numbers, the proofs waiting for a decision, the competencies of their title, and a reminder that their path is read only from here. */
export function TeamMemberDialog({ member, onClose }: { member: TeamMemberDto; onClose: () => void }) {
  const { t } = useTranslation('career-profile');
  const detail = useTeamMember(member.employeeId);
  const data: TeamMemberDetailDto = { ...member, proofs: detail.data?.proofs ?? [], competencies: detail.data?.competencies ?? [] };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={data.name} description={data.titleNameAr ?? undefined} wide>
      <MemberFigures data={data} />
      <WaitingProofs data={data} loaded={!!detail.data} failed={detail.isError} />
      {detail.data && <TeamCompetencies employeeId={data.employeeId} competencies={data.competencies} />}
      <Alert tone="info">{t('team.readOnly')}</Alert>
    </Dialog>
  );
}
