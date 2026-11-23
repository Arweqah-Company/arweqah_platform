import { getNextSnapshot, setup } from 'xstate';
import type { NoticeStatus } from '@arweqah-platform/shared';

export const NOTICE_WORKFLOW_KEY = 'notice.publication';
export const NOTICE_WORKFLOW_VERSION = 1;

/** The events of the notice, with the facts the guards need (the machine keeps no context: the facts come from the row at the moment of the event). */
export type NoticeEvent =
  | { type: 'EDIT'; hasPublished: boolean }
  | { type: 'SUBMIT' }
  | { type: 'DELETE' }
  | { type: 'APPROVE'; hasPublished: boolean }
  | { type: 'REJECT' }
  | { type: 'PUBLISH_DUE' }
  | { type: 'REVISE' }
  | { type: 'REVISE_CANCEL'; hasPublished: boolean }
  | { type: 'ARCHIVE'; hasPublished: boolean };

/** True when a version of the notice was published before (so a pending or rejected notice is a new version of it, not a first publication). */
const hasPublished = ({ event }: { event: NoticeEvent }): boolean => 'hasPublished' in event && event.hasPublished;

/**
 * The life of a notice (docs/plans/phase-8-notices.md §6.1 and §6.9). There is no way from `draft` or `pending_approval` to `published` except the approval
 * of a new version of an already published notice. No timers: publishing on the day is a durable scheduled job.
 * A new version of a published notice (`revising`, `pending_approval`, `rejected` with a published version behind it) hides the notice until it is approved,
 * or until the writer cancels the change (`REVISE_CANCEL`, which brings the published version back).
 */
export const noticeMachine = setup({
  types: { events: {} as NoticeEvent },
  guards: { hasPublished },
}).createMachine({
  id: NOTICE_WORKFLOW_KEY,
  initial: 'draft',
  states: {
    draft: { on: { EDIT: 'draft', SUBMIT: 'pending_approval', DELETE: 'discarded' } },
    pending_approval: {
      on: {
        APPROVE: [{ guard: 'hasPublished', target: 'published' }, { target: 'approved' }],
        REJECT: 'rejected',
        REVISE_CANCEL: { guard: 'hasPublished', target: 'published' },
        ARCHIVE: { guard: 'hasPublished', target: 'archived' },
      },
    },
    rejected: {
      on: {
        EDIT: [{ guard: 'hasPublished', target: 'revising' }, { target: 'draft' }],
        REVISE_CANCEL: { guard: 'hasPublished', target: 'published' },
        ARCHIVE: { guard: 'hasPublished', target: 'archived' },
      },
    },
    approved: { on: { PUBLISH_DUE: 'published', ARCHIVE: 'archived' } },
    published: { on: { REVISE: 'revising', ARCHIVE: 'archived' } },
    revising: { on: { EDIT: 'revising', SUBMIT: 'pending_approval', REVISE_CANCEL: 'published', ARCHIVE: 'archived' } },
    archived: { type: 'final' },
    discarded: { type: 'final' },
  },
});

const snapshotOf = (status: NoticeStatus) => noticeMachine.resolveState({ value: status });

/** May this event happen to a notice in this state? */
export function canHappen(status: NoticeStatus, event: NoticeEvent): boolean {
  return snapshotOf(status).can(event);
}

/** The state the event leads to, or null when the machine refuses it. */
export function nextStatus(status: NoticeStatus, event: NoticeEvent): NoticeStatus | 'discarded' | null {
  if (!canHappen(status, event)) return null;
  return getNextSnapshot(noticeMachine, snapshotOf(status), event).value as NoticeStatus | 'discarded';
}
