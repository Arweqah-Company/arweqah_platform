import type { NoticeChannelCode, NoticeChannelDto } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { Badge, Dialog } from '@/shared/ui';
import { useNoticeWords } from '../shared/notice-ui';
import { ChannelStateBadge } from './channels-model';
import { WritersPanel } from './writers-panel';

/** The writers of one channel (xl): who writes in it, adding and removing. The channel is read from the page's list, so a change shows at once. */
export function WritersDialog({ code, channels, onAdd, onClose }: { code: NoticeChannelCode | null; channels: NoticeChannelDto[]; onAdd: (code: NoticeChannelCode) => void; onClose: () => void }) {
  const { t } = useTranslation('notices');
  const words = useNoticeWords();
  const channel = channels.find((c) => c.code === code);
  return (
    <Dialog xl open={!!channel} onOpenChange={(open) => !open && onClose()} title={channel ? words.channel(channel) : ''} description={channel ? t('channels.writersExplain', { unit: channel.unit ? words.unit(channel.unit) : t('channels.companyWide') }) : undefined}>
      {channel && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2"><ChannelStateBadge channel={channel} /><Badge tone="info">{words.unit(channel.unit)}</Badge></div>
          <WritersPanel channel={channel} onAdd={() => onAdd(channel.code)} />
        </div>
      )}
    </Dialog>
  );
}
