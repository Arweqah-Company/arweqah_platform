import type { NoticeChannelDto } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/lib/error-message';
import { ConfirmDialog } from '@/shared/ui';
import { useDeleteChannel, useToggleChannel } from '../api';
import { useNoticeWords } from '../shared/notice-ui';

export type ChannelCommand = { kind: 'toggle' | 'delete'; channel: NoticeChannelDto };

/** The confirmation of disabling, enabling and deleting a channel: each says what happens to the writers. */
export function ChannelCommandDialog({ command, onClose }: { command: ChannelCommand | null; onClose: () => void }) {
  const { t } = useTranslation('notices');
  const { t: tc } = useTranslation();
  const words = useNoticeWords();
  const toggle = useToggleChannel();
  const remove = useDeleteChannel();
  if (!command) return null;
  const { kind, channel } = command;
  const name = words.channel(channel);
  const kindKey = kind === 'delete' ? 'delete' : channel.isActive ? 'disable' : 'enable';
  const run = async () => {
    try {
      if (kind === 'delete') await remove.mutateAsync(channel.code);
      else await toggle.mutateAsync({ code: channel.code, enable: !channel.isActive });
      toast.success(t(`channels.${kindKey}.done`, { name }));
    } catch (error) {
      toast.error(errorMessage(tc, error));
    }
    onClose();
  };
  return (
    <ConfirmDialog open onOpenChange={(open) => !open && onClose()} title={t(`channels.${kindKey}.title`, { name })} description={t(`channels.${kindKey}.body`, { writers: channel.writersCount })} confirmLabel={t(`channels.${kindKey}.button`)} tone={kind === 'delete' || channel.isActive ? 'danger' : 'primary'} busy={toggle.isPending || remove.isPending} onConfirm={() => void run()} />
  );
}
