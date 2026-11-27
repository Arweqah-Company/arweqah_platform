import { TASK_NOTICE_CHANNELS, type TaskNoticeChannel, type TaskNoticeSettings } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Button, FormField, SectionCard, Select } from '@/shared/ui';
import { useSaveTaskNoticeSettings, useTaskNoticeSettings } from './api';

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const hourLabel = (hour: number) => `${String(hour).padStart(2, '0')}:00`;

/** One yes/no choice with its explanation under it. */
function Choice({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (on: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm">
      <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-petrol-800" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span><span className="block font-medium text-fg">{label}</span><span className="block text-muted">{hint}</span></span>
    </label>
  );
}

/** The form itself; it starts again (new `key`) when the saved settings change. */
function NoticeForm({ saved }: { saved: TaskNoticeSettings }) {
  const { t } = useTranslation('tasks');
  const { t: tc } = useTranslation();
  const save = useSaveTaskNoticeSettings();
  const [draft, setDraft] = useState<TaskNoticeSettings>(saved);
  const set = (patch: Partial<TaskNoticeSettings>) => setDraft((prev) => ({ ...prev, ...patch }));
  const submit = async () => {
    try {
      await save.mutateAsync(draft);
      toast.success(t('noticeSettings.saved'));
    } catch {
      /* shown above the button */
    }
  };
  return (
    <div className="flex flex-col gap-4 sm:col-span-2">
      <FormField label={t('noticeSettings.channel')} hint={t('noticeSettings.channelHint')}>
        {(p) => (
          <Select {...p} value={draft.channel} onChange={(e) => set({ channel: e.target.value as TaskNoticeChannel })}>
            {TASK_NOTICE_CHANNELS.map((channel) => <option key={channel} value={channel}>{t(`noticeSettings.channels.${channel}`)}</option>)}
          </Select>
        )}
      </FormField>
      <Choice label={t('noticeSettings.digest')} hint={t('noticeSettings.digestHint')} checked={draft.digestEnabled} onChange={(on) => set({ digestEnabled: on })} />
      <FormField label={t('noticeSettings.hour')} hint={t('noticeSettings.hourHint')}>
        {(p) => (
          <Select {...p} dir="ltr" disabled={!draft.digestEnabled} value={String(draft.digestHour)} onChange={(e) => set({ digestHour: Number(e.target.value) })}>
            {HOURS.map((hour) => <option key={hour} value={hour}>{hourLabel(hour)}</option>)}
          </Select>
        )}
      </FormField>
      <Choice label={t('noticeSettings.reminders')} hint={t('noticeSettings.remindersHint')} checked={draft.remindersEnabled} onChange={(on) => set({ remindersEnabled: on })} />
      {save.isError && <Alert>{errorMessage(tc, save.error)}</Alert>}
      <div><Button disabled={save.isPending} onClick={() => void submit()}>{tc('actions.save')}</Button></div>
    </div>
  );
}

/** «My task summary and reminders»: where and when I want them (a section of my account page, FR-215…FR-218). */
export function TaskNoticeSection() {
  const { t } = useTranslation('tasks');
  const { t: tc } = useTranslation();
  const settings = useTaskNoticeSettings();
  return (
    <SectionCard id="task-notices" title={t('noticeSettings.title')} description={t('noticeSettings.description')}>
      {settings.isError && <div className="sm:col-span-2"><Alert>{errorMessage(tc, settings.error)}</Alert></div>}
      {settings.data && <NoticeForm key={JSON.stringify(settings.data)} saved={settings.data} />}
    </SectionCard>
  );
}
