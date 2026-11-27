import { REACTION_KEYS, type ReactionKey, type ReactionSummaryDto } from '@arweqah-platform/shared';
import * as Popover from '@radix-ui/react-popover';
import { SmilePlus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Can, usePermissions } from '@/core/permissions/can';
import { cn } from '../lib/cn';

/** What each reaction looks like (the words come from the `reactions.*` texts). */
export const REACTION_EMOJI: Record<ReactionKey, string> = { like: '👍', love: '❤️', care: '🤗', haha: '😂', wow: '😮', sad: '😢' };

const CONTROL = 'inline-flex min-h-8 items-center gap-1 rounded-full border px-2.5 text-sm transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2';

function ReactionChip({ chip, interactive, onClick }: { chip: ReactionSummaryDto; interactive: boolean; onClick: () => void }) {
  const { t } = useTranslation();
  const label = t(`reactions.${chip.reaction}`);
  const names = [...chip.people.map((p) => p.name), ...(chip.count > chip.people.length ? [t('reactions.more', { count: chip.count - chip.people.length })] : [])].join(t('reactions.nameSeparator'));
  const text = t('reactions.chipNames', { reaction: label, names });
  const style = cn(CONTROL, chip.mine ? 'border-link bg-petrol-50 font-bold text-link' : 'border-neutral-200 bg-white text-fg');
  const content = <><span aria-hidden>{REACTION_EMOJI[chip.reaction]}</span><span>{chip.count}</span></>;
  if (!interactive) return <li><span className={style} title={text} aria-label={text} role="img">{content}</span></li>;
  return <li><button type="button" aria-pressed={chip.mine} aria-label={text} title={text} onClick={onClick} className={cn(style, 'hover:bg-petrol-50')}>{content}</button></li>;
}

function ReactionPicker({ mine, onChoose }: { mine: ReactionKey | null; onChoose: (key: ReactionKey) => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button type="button" aria-label={t('reactions.add')} title={t('reactions.add')} className={cn(CONTROL, 'border-neutral-200 bg-white text-muted hover:bg-petrol-50 hover:text-link')}>
          <SmilePlus className="size-4" aria-hidden />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content sideOffset={6} collisionPadding={16} className="animate-fade-in z-50 rounded-full border border-neutral-200 bg-white p-1 shadow-lg shadow-ink/10">
          <div role="group" aria-label={t('reactions.picker')} className="flex gap-0.5">
            {REACTION_KEYS.map((key) => (
              <button key={key} type="button" aria-label={t(`reactions.${key}`)} title={t(`reactions.${key}`)} aria-pressed={mine === key} onClick={() => { setOpen(false); onChoose(key); }} className={cn('grid size-9 place-items-center rounded-full text-xl transition-transform duration-150 hover:scale-110 hover:bg-petrol-50 focus-visible:outline-2', mine === key && 'bg-petrol-50')}>
                <span aria-hidden>{REACTION_EMOJI[key]}</span>
              </button>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

interface Props {
  /** Missing (an API that is not updated yet, an old cached answer) counts as none. */
  reactions?: ReactionSummaryDto[];
  /** The key that lets a person react: without it the chips are shown (who reacted) but nothing can be clicked and the picker is hidden. */
  permission: string;
  onReact: (key: ReactionKey) => void;
  onRemove: () => void;
}

/** The reactions under a reply or a comment: a chip per reaction used (count, mine marked, names on hover) and a button that opens the six to choose from. Clicking one's own reaction removes it; choosing another replaces it. */
export function ReactionBar({ reactions = [], permission, onReact, onRemove }: Props) {
  const { t } = useTranslation();
  const interactive = usePermissions().can(permission);
  const mine = reactions.find((r) => r.mine)?.reaction ?? null;
  const choose = (key: ReactionKey) => (key === mine ? onRemove() : onReact(key));
  if (!interactive && reactions.length === 0) return null;
  return (
    <ul aria-label={t('reactions.list')} className="flex flex-wrap items-center gap-1.5">
      {reactions.map((chip) => <ReactionChip key={chip.reaction} chip={chip} interactive={interactive} onClick={() => choose(chip.reaction)} />)}
      <Can permission={permission}><li><ReactionPicker mine={mine} onChoose={choose} /></li></Can>
    </ul>
  );
}
