import { NOTICE_LIMITS, type NoticeChannelDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/lib/error-message';
import { useLiveError } from '@/shared/lib/live-validation';
import { useAutoEnglish } from '@/shared/lib/use-auto-english';
import { useDebounced } from '@/shared/lib/use-debounced';
import { Alert, Button, Combobox, Dialog, DialogFooter, FormField, Input } from '@/shared/ui';
import { useChannelUnits, useCreateChannel, useRenameChannel } from '../api';
import { useNoticeWords } from '../shared/notice-ui';

const MAX = NOTICE_LIMITS.channelNameMax;

/** A name is required and fits the limit; the message says which. */
function useNameError(label: string) {
  const { t } = useTranslation('notices');
  return (v: string) => (!v.trim() ? t('channels.form.required', { field: label }) : v.trim().length > MAX ? t('channels.form.tooLong', { field: label, max: MAX }) : undefined);
}

function UnitPicker({ value, onPick }: { value: string; onPick: (id: string) => void }) {
  const { t } = useTranslation('notices');
  const words = useNoticeWords();
  const [search, setSearch] = useState('');
  const units = useChannelUnits(useDebounced(search.trim(), 300)).data ?? [];
  const live = useLiveError(value, (v: string) => (v ? undefined : t('channels.form.pickUnit')));
  return (
    <FormField label={`${t('channels.unit')} *`} error={live.error} hint={t('channels.form.unitHint')}>
      {(p) => (
        <Combobox label={t('channels.unit')} id={p.id} aria-describedby={p['aria-describedby']} aria-required invalid={p['aria-invalid']} value={value || null} options={units.map((u) => ({ value: u.id, label: words.unit(u) }))} placeholder={t('channels.form.searchUnit')} onSearch={setSearch} onBlur={live.onBlur} onChange={(id) => onPick(id ?? '')} />
      )}
    </FormField>
  );
}

const nameOk = (v: string) => !!v.trim() && v.trim().length <= MAX;

function NameFields({ names, onChange }: { names: { nameAr: string; nameEn: string }; onChange: (next: { nameAr: string; nameEn: string }) => void }) {
  const { t } = useTranslation('notices');
  const arError = useLiveError(names.nameAr, useNameError(t('channels.form.nameAr')));
  const enError = useLiveError(names.nameEn, useNameError(t('channels.form.nameEn')));
  useAutoEnglish(names.nameAr, names.nameEn, (nameEn) => onChange({ ...names, nameEn }));
  return (
    <>
      <FormField label={`${t('channels.form.nameAr')} *`} error={arError.error}>{(p) => <Input {...p} aria-required maxLength={MAX + 20} onBlur={arError.onBlur} value={names.nameAr} onChange={(e) => onChange({ ...names, nameAr: e.target.value })} />}</FormField>
      <FormField label={`${t('channels.form.nameEn')} *`} error={enError.error} hint={t('channels.form.nameEnHint')}>{(p) => <Input {...p} dir="ltr" aria-required maxLength={MAX + 20} onBlur={enError.onBlur} value={names.nameEn} onChange={(e) => onChange({ ...names, nameEn: e.target.value })} />}</FormField>
    </>
  );
}

/** Creating or renaming: the request of whichever the form is, and what to do when it is done. */
function useChannelSave(channel: NoticeChannelDto | null, onClose: () => void) {
  const { t } = useTranslation('notices');
  const create = useCreateChannel();
  const rename = useRenameChannel(channel?.code ?? '');
  const save = async (names: { nameAr: string; nameEn: string }, unitId: string) => {
    try {
      if (channel) await rename.mutateAsync({ nameAr: names.nameAr.trim(), nameEn: names.nameEn.trim() });
      else await create.mutateAsync({ nameAr: names.nameAr.trim(), nameEn: names.nameEn.trim(), unitId });
      toast.success(t(channel ? 'channels.form.renamed' : 'channels.form.created'));
      onClose();
    } catch {
      /* shown in the dialog */
    }
  };
  return { mutation: channel ? rename : create, save };
}

const namesOf = (channel: NoticeChannelDto | null) => ({ nameAr: channel?.nameAr ?? '', nameEn: channel?.nameEn ?? '' });
const isValid = (names: { nameAr: string; nameEn: string }, needsUnit: boolean, unitId: string) => nameOk(names.nameAr) && nameOk(names.nameEn) && (!needsUnit || !!unitId);

function Form({ channel, onClose }: { channel: NoticeChannelDto | null; onClose: () => void }) {
  const { t } = useTranslation('notices');
  const { t: tc } = useTranslation();
  const [names, setNames] = useState(namesOf(channel));
  const [unitId, setUnitId] = useState('');
  const { mutation, save } = useChannelSave(channel, onClose);
  const renaming = !!channel;
  const valid = isValid(names, !renaming, unitId);
  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); if (valid) void save(names, unitId); }} noValidate>
      {mutation.isError && <Alert>{errorMessage(tc, mutation.error)}</Alert>}
      <NameFields names={names} onChange={setNames} />
      {renaming ? <p className="text-sm text-muted">{t('channels.form.unitFixed')}</p> : <><UnitPicker value={unitId} onPick={setUnitId} /><Alert tone="info">{t('channels.form.info')}</Alert></>}
      <DialogFooter>
        <Button variant="secondary" type="button" onClick={onClose}>{tc('actions.cancel')}</Button>
        <Button type="submit" disabled={!valid || mutation.isPending}>{t(renaming ? 'channels.form.saveRename' : 'channels.form.submit')}</Button>
      </DialogFooter>
    </form>
  );
}

/** «Add a channel» (name in both languages and the unit it belongs to; its writer role is made with it) or, with a channel, «Rename the channel» (the unit never changes). */
export function ChannelFormDialog({ open, channel, onClose }: { open: boolean; channel: NoticeChannelDto | null; onClose: () => void }) {
  const { t } = useTranslation('notices');
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()} title={t(channel ? 'channels.form.titleRename' : 'channels.form.titleNew')} description={t(channel ? 'channels.form.descriptionRename' : 'channels.form.descriptionNew')}>
      {open && <Form key={channel?.code ?? 'new'} channel={channel} onClose={onClose} />}
    </Dialog>
  );
}
