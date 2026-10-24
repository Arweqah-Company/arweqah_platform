import type { TaskAbilitiesDto, TaskStatus } from '@arweqah-platform/shared';
import { reachableStatuses, type MoveActor } from './task-transitions.rules';

export interface AbilityFacts {
  status: TaskStatus;
  needsReview: boolean;
  archived: boolean;
  actor: MoveActor;
  isApprover: boolean;
  isCreator: boolean;
  isAssignee: boolean;
  hasOpenObjection: boolean;
  /** Which keys the viewer holds (the screen hides what a person lacks; the API checks again). */
  can: { update: boolean; approve: boolean; object: boolean; follow: boolean; logTime: boolean; resubmit: boolean; restore: boolean; move: boolean };
  /** Objection rules already applied. */
  mayObject: boolean;
}

const all = (...conditions: boolean[]): boolean => conditions.every(Boolean);

/** What the viewer may do with a task right now. A button that is not here must not be shown. */
export function abilitiesOf(f: AbilityFacts): TaskAbilitiesDto {
  const live = !f.archived;
  const open = f.status !== 'done' && f.status !== 'rejected';
  return {
    moveTo: all(live, f.can.move) ? reachableStatuses(f.status, f.needsReview, f.actor) : [],
    edit: all(live, open || f.status === 'rejected', f.can.update),
    approve: all(live, f.can.approve, f.isApprover, f.status === 'pending_approval'),
    object: all(live, f.can.object, f.mayObject),
    answerObjection: all(live, f.hasOpenObjection, f.isCreator, f.can.update),
    resubmit: all(live, f.can.resubmit, f.isCreator, f.status === 'rejected'),
    follow: f.can.follow,
    logTime: all(live, open, f.can.logTime, f.isAssignee),
    restore: all(f.archived, f.can.restore),
  };
}
