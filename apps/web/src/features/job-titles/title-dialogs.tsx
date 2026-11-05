import type { JobTitleListItemDto } from '@arweqah-platform/shared';
import { useTitleCard } from './api';
import { TitleCardDialog } from './title-card-dialog';
import { TitleContentDialog } from './title-content-dialog';
import { DeleteTitleDialog, EditTitleDialog } from './titles-forms';

/** What the job-titles page has open: a title's card, the editor of its content, its edit form, or its deletion. */
export type TitleDialogState = { kind: 'card' | 'content' | 'edit' | 'delete'; title: JobTitleListItemDto } | { kind: 'add' } | null;

/** The list item as the edit and delete forms know a title (the content version is not shown there). */
export const asTitleDto = (x: JobTitleListItemDto) => ({ id: x.id, orgNodeId: x.orgNodeId, nameAr: x.nameAr, nameEn: x.nameEn, isActive: x.isActive, employeesCount: x.occupants, code: x.code, grade: x.grade, track: x.track, reportsToTitleId: x.reportsToTitleId, contentVersion: 0 });

/** The content editor opened straight from a row: it needs the card's lists, so it waits for them. */
function ContentFromRow({ id, onClose }: { id: string; onClose: () => void }) {
  const card = useTitleCard(id);
  return card.data ? <TitleContentDialog card={card.data} onClose={onClose} /> : null;
}

/** Shows the dialog the page has open; `onClose` closes it. */
export function TitleDialogs({ state, onClose }: { state: TitleDialogState; onClose: () => void }) {
  if (!state || state.kind === 'add') return null;
  const close = (open: boolean) => !open && onClose();
  if (state.kind === 'card') return <TitleCardDialog titleId={state.title.id} onClose={onClose} />;
  if (state.kind === 'content') return <ContentFromRow id={state.title.id} onClose={onClose} />;
  if (state.kind === 'edit') return <EditTitleDialog title={asTitleDto(state.title)} open onOpenChange={close} />;
  return <DeleteTitleDialog title={asTitleDto(state.title)} open onOpenChange={close} />;
}
