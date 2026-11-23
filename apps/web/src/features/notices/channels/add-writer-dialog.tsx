import { CorePermission, type NoticeChannelCode, type NoticeChannelDto, type NoticeWriterCandidateDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { usePermissions } from '@/core/permissions/can';
import { errorMessage } from '@/shared/lib/error-message';
import { useLiveError } from '@/shared/lib/live-validation';
import { useDebounced } from '@/shared/lib/use-debounced';
import { Alert, Button, Combobox, Dialog, FormField, Select } from '@/shared/ui';
import { useAddWriter, useWriterCandidates } from '../api';
import { useNoticeWords } from '../shared/notice-ui';

function CandidatePicker({ code, value, onPick }: { code: NoticeChannelCode; value: NoticeWriterCandidateDto | null; onPick: (c: NoticeWriterCandidateDto | null) => void }) {
  const { t } = useTranslation('notices');
  const words = useNoticeWords();
  const [search, setSearch] = useState('');
  const term = useDebounced(search.trim(), 300);
  const found = useWriterCandidates(code, term).data ?? [];
  const live = useLiveError(value, (v: NoticeWriterCandidateDto | null) => (v ? undefined : t('addWriter.pickFromList')));
  const all = value && !found.some((c) => c.employeeId === value.employeeId) ? [value, ...found] : found;
  const options = all.map((c) => ({ value: c.employeeId, label: c.name, hint: [c.jobTitle && (words.ar ? c.jobTitle.nameAr : c.jobTitle.nameEn), words.unit(c.unit)].filter((x) => x && x !== '—').join(' · ') }));
  return (
    <FormField label={`${t('addWriter.employee')} *`} error={live.error} hint={t('addWriter.employeeHint')}>
      {(p) => (
        <Combobox
          label={t('addWriter.employee')}
          id={p.id}
          aria-describedby={p['aria-describedby']}
          aria-required
          invalid={p['aria-invalid']}
          value={value?.employeeId ?? null}
          options={options}
          placeholder={t('addWriter.search')}
          onSearch={setSearch}
          onBlur={live.onBlur}
          onChange={(id) => onPick(all.find((c) => c.employeeId === id) ?? null)}
        />
      )}
    </FormField>
  );
}

function Body({ channels, initial, onClose }: { channels: NoticeChannelDto[]; initial: NoticeChannelCode; onClose: () => void }) {
  const { t } = useTranslation('notices');
  const { t: tc } = useTranslation();
  const words = useNoticeWords();
  const [code, setCode] = useState<NoticeChannelCode>(initial);
  const [picked, setPicked] = useState<NoticeWriterCandidateDto | null>(null);
  const add = useAddWriter(code);
  const submit = async () => {
    if (!picked) return;
    try {
      await add.mutateAsync({ employeeId: picked.employeeId });
      toast.success(t('addWriter.done', { name: picked.name }));
      onClose();
    } catch {
      /* shown below */
    }
  };
  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); void submit(); }} noValidate>
      {add.isError && <Alert>{errorMessage(tc, add.error)}</Alert>}
      <FormField label={`${t('addWriter.channel')} *`}>
        {(p) => (
          <Select {...p} value={code} onChange={(e) => { setCode(e.target.value as NoticeChannelCode); setPicked(null); }}>
            {channels.map((c) => <option key={c.code} value={c.code}>{words.channel(c)}</option>)}
          </Select>
        )}
      </FormField>
      <CandidatePicker key={code} code={code} value={picked} onPick={setPicked} />
      {picked && <p className="text-sm text-muted">{[picked.jobTitle && (words.ar ? picked.jobTitle.nameAr : picked.jobTitle.nameEn), words.unit(picked.unit)].filter((x) => x && x !== '—').join(' · ')}</p>}
      <Alert tone="info">{t('addWriter.info')}</Alert>
      {picked?.hasNoApprover && <Alert tone="warning">{t('addWriter.noApprover')}</Alert>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" type="button" onClick={onClose}>{tc('actions.cancel')}</Button>
        <Button type="submit" disabled={!picked || add.isPending}>{t('addWriter.submit')}</Button>
      </div>
    </form>
  );
}

/** «Add a writer»: the channel (one the person may add to) and the employee, found by name from the first letter inside their reach. */
export function AddWriterDialog({ channels, initial, onClose }: { channels: NoticeChannelDto[]; initial: NoticeChannelCode | null; onClose: () => void }) {
  const { t } = useTranslation('notices');
  const { can } = usePermissions();
  const allowed = channels.filter((c) => c.canAddWriter && can(CorePermission.NoticesWriterAdd));
  const first = allowed.find((c) => c.code === initial) ?? allowed[0];
  return (
    <Dialog open={!!initial && !!first} onOpenChange={(open) => !open && onClose()} title={t('addWriter.title')} description={t('addWriter.description')}>
      {first && <Body channels={allowed} initial={first.code} onClose={onClose} />}
    </Dialog>
  );
}
