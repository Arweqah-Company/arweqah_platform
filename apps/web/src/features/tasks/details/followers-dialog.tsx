import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/lib/error-message';
import { useDebounced } from '@/shared/lib/use-debounced';
import { Alert, Combobox, Dialog, FormField, RowAction } from '@/shared/ui';
import { useAddFollower, useFollowerCandidates, useRemoveFollower, useTaskFollowers } from '../api';

/** Who follows this task: choose a colleague to add (searched on the server from the first letter), and remove a follower with the trash icon. */
export function FollowersDialog({ taskId, open, onOpenChange }: { taskId: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation('tasks');
  const { t: tc } = useTranslation();
  const [search, setSearch] = useState('');
  const term = useDebounced(search, 250);
  const followers = useTaskFollowers(taskId, open);
  const candidates = useFollowerCandidates(taskId, term, open);
  const add = useAddFollower(taskId);
  const remove = useRemoveFollower(taskId);
  const run = async (action: () => Promise<unknown>, done: string) => {
    try {
      await action();
      toast.success(done);
      setSearch('');
    } catch (error) {
      toast.error(errorMessage(tc, error));
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t('followersDialog.title')} description={t('followersDialog.description')} wide>
      <div className="flex flex-col gap-4">
        <FormField label={t('followersDialog.add')} hint={t('followersDialog.hint')}>
          {(p) => <Combobox {...p} label={t('followersDialog.add')} value={null} disabled={add.isPending} onSearch={setSearch} onChange={(id) => id && void run(() => add.mutateAsync(id), t('followersDialog.added'))} options={(candidates.data ?? []).map((c) => ({ value: c.userId, label: c.name }))} />}
        </FormField>
        {followers.isError && <Alert>{errorMessage(tc, followers.error)}</Alert>}
        <ul aria-label={t('followersDialog.current')} className="flex flex-col gap-2">
          {(followers.data ?? []).map((f) => (
            <li key={f.userId} className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 px-4 py-2 text-sm">
              <span>{f.name}</span>
              <RowAction label={t('followersDialog.remove', { name: f.name })} icon={Trash2} danger onClick={() => void run(() => remove.mutateAsync(f.userId), t('followersDialog.removed'))} />
            </li>
          ))}
          {followers.isSuccess && followers.data.length === 0 && <li className="text-sm text-muted">{t('followersDialog.none')}</li>}
        </ul>
      </div>
    </Dialog>
  );
}
