import type { TaskStatus } from '@arweqah-platform/shared';

/** Who is moving the task, as far as the rules care. */
export interface MoveActor {
  isAssignee: boolean;
  isReviewer: boolean;
  /** The one who gave the task. */
  isCreator: boolean;
  /** A manager whose team reach covers the assignee (and who holds the team status key). */
  isTeamManager: boolean;
}

export interface MoveRequest {
  from: TaskStatus;
  to: TaskStatus;
  needsReview: boolean;
  actor: MoveActor;
  /** The note that came with the move, if any. */
  hasNote: boolean;
}

export type MoveRefusal = 'NO_CHANGE' | 'AWAITING_APPROVAL' | 'REJECTED_TASK' | 'NOT_ALLOWED_PATH' | 'NOT_ASSIGNEE' | 'NOT_REVIEWER' | 'NOT_CREATOR_OR_MANAGER' | 'REVIEW_NOT_REQUIRED';

export type MoveDecision =
  | { ok: true; to: TaskStatus; finishes: boolean; reopens: boolean; needsNote: boolean }
  | { ok: false; reason: MoveRefusal };

const refuse = (reason: MoveRefusal): MoveDecision => ({ ok: false, reason });
const move = (to: TaskStatus, extra: Partial<{ finishes: boolean; reopens: boolean; needsNote: boolean }> = {}): MoveDecision => ({ ok: true, to, finishes: false, reopens: false, needsNote: false, ...extra });

const doer = (a: MoveActor): boolean => a.isAssignee || a.isTeamManager;

/**
 * The only table of moves. Nothing else changes a task's status, and the board only asks this table.
 *  - waiting for approval moves only when the approver approves or rejects, never by dragging; a rejected task is resubmitted, not moved;
 *  - to do → in progress, and in progress → done: the assignee or a manager of the team; a task that needs review goes to awaiting review;
 *  - awaiting review → done, or back to in progress (a note is required): the reviewer only;
 *  - done → to do / in progress (/ awaiting review for a task that needs review): reopening, by who gave the task or a manager.
 */
export function decideMove(r: MoveRequest): MoveDecision {
  if (r.from === r.to) return refuse('NO_CHANGE');
  if (r.from === 'pending_approval') return refuse('AWAITING_APPROVAL');
  if (r.from === 'rejected' || r.to === 'rejected' || r.to === 'pending_approval') return refuse('REJECTED_TASK');
  return FROM[r.from]?.(r) ?? refuse('NOT_ALLOWED_PATH');
}

function start(r: MoveRequest): MoveDecision {
  if (r.to !== 'in_progress') return refuse('NOT_ALLOWED_PATH');
  return doer(r.actor) ? move('in_progress') : refuse('NOT_ASSIGNEE');
}

function finishWork(r: MoveRequest): MoveDecision {
  if (r.to !== 'done' && r.to !== 'awaiting_review') return refuse('NOT_ALLOWED_PATH');
  if (!doer(r.actor)) return refuse('NOT_ASSIGNEE');
  if (r.to === 'awaiting_review' && !r.needsReview) return refuse('REVIEW_NOT_REQUIRED');
  return r.needsReview ? move('awaiting_review') : move('done', { finishes: true });
}

function review(r: MoveRequest): MoveDecision {
  if (!r.actor.isReviewer) return refuse('NOT_REVIEWER');
  if (r.to === 'done') return move('done', { finishes: true });
  return r.to === 'in_progress' ? move('in_progress', { needsNote: true }) : refuse('NOT_ALLOWED_PATH');
}

function reopen(r: MoveRequest): MoveDecision {
  if (!r.actor.isCreator && !r.actor.isTeamManager) return refuse('NOT_CREATOR_OR_MANAGER');
  const allowed = r.to === 'todo' || r.to === 'in_progress' || (r.to === 'awaiting_review' && r.needsReview);
  return allowed ? move(r.to, { reopens: true }) : refuse('NOT_ALLOWED_PATH');
}

const FROM: Partial<Record<TaskStatus, (r: MoveRequest) => MoveDecision>> = { todo: start, in_progress: finishWork, awaiting_review: review, done: reopen };

/** Where a task could be moved by this actor right now (the board uses it to show what a drag may do). */
export function reachableStatuses(from: TaskStatus, needsReview: boolean, actor: MoveActor): TaskStatus[] {
  const all: TaskStatus[] = ['todo', 'in_progress', 'awaiting_review', 'done'];
  return all.filter((to) => decideMove({ from, to, needsReview, actor, hasNote: true }).ok);
}
