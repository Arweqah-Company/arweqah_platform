import type { EvalBlock, SaveTeamEvaluationInput, TeamEvaluationDto, TeamEvaluationRowDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ApiError } from '@/core/api/api-client';
import { Alert, Button, Dialog, DialogFooter, GuardedButton } from '@/shared/ui';
import { useSaveTeam, useSendTeam, useTeamMember } from './api';
import { BehavioursPart, ExtraPart, ResultsPart } from './team-form';
import { formErrors, liveScore } from './team-form-state';
import { TeamScoreCard } from './team-score-card';

/** The words that say why the evaluation cannot be written now (the same text on the button and in the window). */
export function useBlockText() {
  const { t } = useTranslation('performance');
  return (block: EvalBlock, manager?: string | null): string => t(`team.block.${block}`, { stage: t('stages.self.title'), manager: manager ?? '' });
}

/** The alert at the top: why the form is read only, who sees it next, and what the employee said about themselves. */
function Notices({ dto, text }: { dto: TeamEvaluationDto; text: ReturnType<typeof useBlockText> }) {
  const { t } = useTranslation('performance');
  return (
    <>
      <Alert tone={dto.self.sentAt ? 'info' : 'warning'}>{dto.self.sentAt ? t('team.selfSent') : t('team.selfNotSent')}</Alert>
      {dto.block && <Alert tone="warning">{text(dto.block, dto.directManagerName)}</Alert>}
      {!dto.block && <Alert tone="info">{dto.level === 'direct' ? t('team.next.direct', { upper: dto.upperManagerName ?? t('team.next.calibration') }) : t('team.next.upper', { direct: dto.directManagerName ?? '' })}</Alert>}
    </>
  );
}

/** The window of one member: the form, the live card, and the buttons (draft, send), all locked when something blocks writing. */
function TeamBody({ dto, onClose }: { dto: TeamEvaluationDto; onClose: () => void }) {
  const { t } = useTranslation('performance');
  const text = useBlockText();
  const [form, setForm] = useState<SaveTeamEvaluationInput>(dto.form);
  const [tried, setTried] = useState(false);
  const save = useSaveTeam(dto.employeeId);
  const send = useSendTeam(dto.employeeId);
  const errors = formErrors(dto, form);
  const invalid = Object.keys(errors).length > 0;
  const sent = dto.sentAt !== null;
  const { score, band } = liveScore(dto, form);
  const part = { dto, form, onChange: setForm, tried, errors, locked: !!dto.block };
  const failed = (send.error ?? save.error) instanceof ApiError ? t('team.failedRefused') : send.error || save.error ? t('team.failed') : null;
  const submit = () => { setTried(true); if (!invalid) send.mutate(form, { onSuccess: () => { toast.success(t(sent ? 'team.edited' : 'team.sentDone')); onClose(); } }); };
  return (
    <div className="flex flex-col gap-4">
      <Notices dto={dto} text={text} />
      <ResultsPart {...part} />
      <BehavioursPart {...part} />
      <ExtraPart {...part} />
      <TeamScoreCard score={score} band={band} cap={dto.template.cap} />
      {failed && <Alert tone="danger">{failed}</Alert>}
      <DialogFooter>
        {!sent && !dto.block && <Button variant="secondary" disabled={save.isPending} onClick={() => save.mutate(form, { onSuccess: () => { toast.success(t('team.draftSaved')); onClose(); } })}>{t('team.saveDraft')}</Button>}
        <GuardedButton blocked={!!dto.block} reason={dto.block ? text(dto.block, dto.directManagerName) : ''} disabled={send.isPending} onClick={submit}>{t(sent ? 'team.saveEdit' : 'team.send')}</GuardedButton>
        <Button variant="secondary" onClick={onClose}>{t('close')}</Button>
      </DialogFooter>
    </div>
  );
}

/** The evaluation window of a member (a click on the row): loads the member's evaluation, then shows the form. */
export function TeamDialog({ row, onClose }: { row: TeamEvaluationRowDto; onClose: () => void }) {
  const { t } = useTranslation('performance');
  const member = useTeamMember(row.employeeId);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t('team.dialogTitle', { name: row.name })} description={t('team.dialogDescription')} xl>
      {member.isError && <Alert tone="danger">{t('team.loadFailed')}</Alert>}
      {member.data && <TeamBody dto={member.data} onClose={onClose} />}
    </Dialog>
  );
}
