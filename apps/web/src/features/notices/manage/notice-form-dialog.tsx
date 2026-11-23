import { NOTICE_LIMITS, type NoticeChannelCode, type NoticeDetailsDto, type NoticeType } from '@arweqah-platform/shared';
import { CorePermission } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Can, usePermissions } from '@/core/permissions/can';
import { errorMessage } from '@/shared/lib/error-message';
import { useLiveError, useRules } from '@/shared/lib/live-validation';
import { useAutoEnglish } from '@/shared/lib/use-auto-english';
import { Alert, Button, ConfirmDialog, Dialog, DialogFooter, FileAttachments, FormField, Input, Select, Textarea } from '@/shared/ui';
import { useCreateNotice, useNotice, useNoticeAction, useNoticeOptions, useUpdateNotice } from '../api';
import { AudienceField } from './audience-field';
import { draftOf, emptyDraft, inputOf, missingOf, riyadhToday, type Draft, type FormMode } from './notice-draft';

export type { FormMode };

interface FieldsProps {
  draft: Draft;
  mode: FormMode;
  patch: (change: Partial<Draft>) => void;
}

function KindCards({ value, onChange }: { value: NoticeType | ''; onChange: (kind: NoticeType) => void }) {
  const { t } = useTranslation('notices');
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium">{t('form.kind')} *</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {(['announcement', 'policy'] as const).map((k) => (
          <label key={k} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-neutral-200 p-4 text-sm has-[:checked]:border-link has-[:checked]:bg-petrol-50">
            <input type="radio" name="notice-kind" className="mt-1 size-4 accent-petrol-800" checked={value === k} onChange={() => onChange(k)} />
            <span><span className="block font-medium">{t(`form.kindCards.${k}`)}</span><span className="block text-xs text-muted">{t(`form.kindCards.${k}Hint`)}</span></span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function ChannelAndDate({ draft, mode, patch }: FieldsProps) {
  const { t } = useTranslation('notices');
  const words = useChannelNames();
  const data = useNoticeOptions().data;
  // Only the enabled channels the person writes in (a notice already in a channel keeps it in the list).
  const options = (data?.channels ?? []).filter((c) => data?.writableChannelCodes.includes(c.code) || c.code === draft.channelCode);
  const today = riyadhToday();
  const date = useLiveError(draft.publishOn, (v: string) => (!v ? t('form.dateRequired') : v < today ? t('form.datePast') : undefined));
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField label={`${t('form.channel')} *`} hint={t('form.channelHint')}>
        {(p) => (
          <Select {...p} aria-required disabled={mode === 'revise' || options.length === 1} value={draft.channelCode} onChange={(e) => patch({ channelCode: e.target.value as NoticeChannelCode })}>
            <option value="">{t('form.choose')}</option>
            {options.map((c) => <option key={c.code} value={c.code}>{words(c)}</option>)}
          </Select>
        )}
      </FormField>
      {mode === 'revise' ? (
        <p className="self-end text-sm text-muted">{t('form.revisePublishes')}</p>
      ) : (
        <FormField label={`${t('form.publishOn')} *`} error={date.error}>{(p) => <Input {...p} type="date" dir="ltr" min={today} aria-required onBlur={date.onBlur} value={draft.publishOn} onChange={(e) => patch({ publishOn: e.target.value })} />}</FormField>
      )}
    </div>
  );
}

function useChannelNames() {
  const { i18n } = useTranslation();
  return (c: { nameAr: string; nameEn: string }) => (i18n.language === 'ar' ? c.nameAr : c.nameEn);
}

function TitlesAndBody({ draft, patch }: FieldsProps) {
  const { t } = useTranslation('notices');
  const rules = useRules();
  const titleAr = useLiveError(draft.titleAr, rules.text(1));
  const body = useLiveError(draft.body, rules.text(1));
  useAutoEnglish(draft.titleAr, draft.titleEn, (titleEn) => patch({ titleEn }));
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={`${t('form.titleAr')} *`} error={titleAr.error}>{(p) => <Input {...p} maxLength={NOTICE_LIMITS.titleMax} placeholder={t('form.titleArExample')} aria-required onBlur={titleAr.onBlur} value={draft.titleAr} onChange={(e) => patch({ titleAr: e.target.value })} />}</FormField>
        <FormField label={t('form.titleEn')} hint={t('form.titleEnHint')}>{(p) => <Input {...p} dir="ltr" maxLength={NOTICE_LIMITS.titleMax} value={draft.titleEn} onChange={(e) => patch({ titleEn: e.target.value })} />}</FormField>
      </div>
      <FormField label={`${t('form.body')} *`} hint={t('form.bodyHint')} error={body.error}>{(p) => <Textarea {...p} rows={7} maxLength={NOTICE_LIMITS.bodyMax} aria-required onBlur={body.onBlur} value={draft.body} onChange={(e) => patch({ body: e.target.value })} />}</FormField>
    </>
  );
}

function Fields(props: FieldsProps) {
  const { t } = useTranslation('notices');
  const { draft, patch } = props;
  return (
    <div className="flex flex-col gap-5">
      <ChannelAndDate {...props} />
      <KindCards value={draft.kind} onChange={(kind) => patch({ kind })} />
      <TitlesAndBody {...props} />
      <AudienceField draft={draft} onPatch={patch} />
      <FileAttachments compact label={t('form.files')} files={draft.files} max={NOTICE_LIMITS.files} onChange={(files) => patch({ files })} />
    </div>
  );
}

interface BodyProps {
  mode: FormMode;
  notice: NoticeDetailsDto | null;
  firstChannel: NoticeChannelCode | '';
  onClose: () => void;
}

function useSaving({ mode, notice, onClose }: Pick<BodyProps, 'mode' | 'notice' | 'onClose'>, draft: Draft) {
  const { t } = useTranslation('notices');
  const { t: tc } = useTranslation();
  const create = useCreateNotice();
  const update = useUpdateNotice(notice?.id ?? '');
  const action = useNoticeAction();
  const [error, setError] = useState<string | null>(null);
  const save = async (andSubmit: boolean) => {
    setError(null);
    try {
      const input = inputOf(draft, mode);
      const { publishOn, ...withoutDate } = input;
      const changes = mode === 'revise' ? withoutDate : { ...withoutDate, publishOn };
      const saved = notice ? await update.mutateAsync({ ...changes, revision: notice.revision }) : await create.mutateAsync(input);
      if (andSubmit) await action.mutateAsync({ id: saved.id, action: 'submit' });
      toast.success(andSubmit ? t('done.submit') : t('form.savedDraft'));
      onClose();
    } catch (failure) {
      setError(errorMessage(tc, failure));
    }
  };
  return { save, error, busy: create.isPending || update.isPending || action.isPending };
}

function FormBody(props: BodyProps) {
  const { t } = useTranslation('notices');
  const { mode, notice, firstChannel, onClose } = props;
  const [initial] = useState<Draft>(() => (notice ? draftOf(notice) : emptyDraft(firstChannel)));
  const [draft, setDraft] = useState<Draft>(initial);
  const [leaving, setLeaving] = useState(false);
  const { save, error, busy } = useSaving(props, draft);
  const { can } = usePermissions();
  const missing = missingOf(draft, mode);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const saveKey = notice ? CorePermission.NoticesEdit : CorePermission.NoticesCreate;
  return (
    <form className="flex flex-col gap-5" onSubmit={(e) => e.preventDefault()} noValidate>
      {error && <Alert>{error}</Alert>}
      <Fields draft={draft} mode={mode} patch={(c) => setDraft((d) => ({ ...d, ...c }))} />
      <DialogFooter>
        {missing && <span className="me-auto text-xs text-muted">{t(`form.missing.${missing}`)}</span>}
        <Button variant="secondary" type="button" onClick={() => (dirty ? setLeaving(true) : onClose())}>{t('form.cancel')}</Button>
        <Can permission={saveKey}><Button variant="secondary" type="button" disabled={busy || !draft.channelCode || !draft.kind || !draft.titleAr.trim()} onClick={() => void save(false)}>{t('form.saveDraft')}</Button></Can>
        {can(CorePermission.NoticesSubmit) && <Button type="button" disabled={busy || !!missing} onClick={() => void save(true)}>{t('form.submit')}</Button>}
      </DialogFooter>
      <ConfirmDialog open={leaving} onOpenChange={setLeaving} title={t('form.discard.title')} description={t('form.discard.body')} confirmLabel={t('form.discard.button')} tone="danger" onConfirm={onClose} />
    </form>
  );
}

function Loader({ mode, id, onClose }: { mode: FormMode; id: string | null; onClose: () => void }) {
  const { t } = useTranslation('notices');
  const { t: tc } = useTranslation();
  const notice = useNotice(id);
  const options = useNoticeOptions();
  if (notice.isError) return <Alert>{errorMessage(tc, notice.error)}</Alert>;
  if ((id && !notice.data) || !options.data) return <div role="status" aria-busy aria-label={t('loading')} className="h-40 animate-pulse rounded-2xl bg-neutral-50" />;
  const writable = options.data.writableChannelCodes;
  return <FormBody mode={mode} notice={notice.data ?? null} firstChannel={writable.length === 1 ? (writable[0] ?? '') : ''} onClose={onClose} />;
}

/** «New notice» / «Edit the notice» / «New version of …»: the writer's form; closing with unsaved changes asks first. */
export function NoticeFormDialog({ mode, id, onClose }: { mode: FormMode; id: string | null; onClose: () => void }) {
  const { t } = useTranslation('notices');
  const loaded = useNotice(id).data;
  const title = mode === 'new' ? t('form.titleNew') : mode === 'edit' ? t('form.titleEdit') : t('form.titleRevise', { title: loaded?.titleAr ?? '' });
  return (
    <Dialog wide open onOpenChange={(open) => !open && onClose()} title={title}>
      <Loader mode={mode} id={id} onClose={onClose} />
    </Dialog>
  );
}
