import { CorePermission, type NoticeAbilitiesDto, type NoticeStatus } from '@arweqah-platform/shared';
import { canHappen, type NoticeEvent } from './notice-machine';

export interface AbilityFacts {
  status: NoticeStatus;
  /** A version of the notice was published before. */
  hasPublished: boolean;
  isAuthor: boolean;
  isPinned: boolean;
}

/** What the person holds: a key at any scope, and a key that reaches this notice. */
export interface KeyAccess {
  has(key: string): boolean;
  reaches(key: string): boolean;
}

type WriterAbilities = Pick<NoticeAbilitiesDto, 'edit' | 'submit' | 'delete' | 'revise' | 'reviseCancel'>;
type ReviewerAbilities = Pick<NoticeAbilitiesDto, 'approve' | 'reject'>;
type PublisherAbilities = Pick<NoticeAbilitiesDto, 'pin' | 'unpin' | 'archive'>;

const NOTHING: WriterAbilities = { edit: false, submit: false, delete: false, revise: false, reviseCancel: false };

/** The writer's own actions: only on a notice they wrote, with the key, in a state the machine accepts. */
function writerAbilities(f: AbilityFacts, keys: KeyAccess): WriterAbilities {
  if (!f.isAuthor) return NOTHING;
  const ok = (key: string, event: NoticeEvent) => keys.has(key) && canHappen(f.status, event);
  return {
    edit: ok(CorePermission.NoticesEdit, { type: 'EDIT', hasPublished: f.hasPublished }),
    submit: ok(CorePermission.NoticesSubmit, { type: 'SUBMIT' }),
    delete: ok(CorePermission.NoticesDelete, { type: 'DELETE' }),
    revise: ok(CorePermission.NoticesRevise, { type: 'REVISE' }),
    reviseCancel: ok(CorePermission.NoticesReviseCancel, { type: 'REVISE_CANCEL', hasPublished: f.hasPublished }),
  };
}

/** Approving and rejecting: a notice waiting, written by somebody else inside the reach of the key. */
function reviewerAbilities(f: AbilityFacts, keys: KeyAccess): ReviewerAbilities {
  const waiting = !f.isAuthor && f.status === 'pending_approval';
  return { approve: waiting && keys.reaches(CorePermission.NoticesApprove), reject: waiting && keys.reaches(CorePermission.NoticesReject) };
}

function publisherAbilities(f: AbilityFacts, keys: KeyAccess): PublisherAbilities {
  const mayPin = keys.reaches(CorePermission.NoticesPin);
  return {
    pin: mayPin && f.status === 'published' && !f.isPinned,
    unpin: mayPin && f.isPinned,
    archive: keys.reaches(CorePermission.NoticesArchive) && canHappen(f.status, { type: 'ARCHIVE', hasPublished: f.hasPublished }),
  };
}

export function abilitiesFor(facts: AbilityFacts, keys: KeyAccess): NoticeAbilitiesDto {
  return { ...writerAbilities(facts, keys), ...reviewerAbilities(facts, keys), ...publisherAbilities(facts, keys) };
}
