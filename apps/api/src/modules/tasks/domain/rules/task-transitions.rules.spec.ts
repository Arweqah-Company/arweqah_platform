import type { TaskStatus } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { decideMove, reachableStatuses, type MoveActor } from './task-transitions.rules';

const nobody: MoveActor = { isAssignee: false, isReviewer: false, isCreator: false, isTeamManager: false };
const as = (who: Partial<MoveActor>): MoveActor => ({ ...nobody, ...who });
const move = (from: TaskStatus, to: TaskStatus, actor: MoveActor, needsReview = false) => decideMove({ from, to, needsReview, actor, hasNote: false });

describe('Task transition table (FR-50)', () => {
  it('never moves a task waiting for approval, or a rejected one, or to those statuses', () => {
    for (const to of ['todo', 'in_progress', 'awaiting_review', 'done'] as const) {
      expect(move('pending_approval', to, as({ isAssignee: true, isTeamManager: true }))).toEqual({ ok: false, reason: 'AWAITING_APPROVAL' });
      expect(move('rejected', to, as({ isCreator: true, isTeamManager: true }))).toEqual({ ok: false, reason: 'REJECTED_TASK' });
    }
    expect(move('todo', 'rejected', as({ isAssignee: true }))).toEqual({ ok: false, reason: 'REJECTED_TASK' });
    expect(move('todo', 'pending_approval', as({ isAssignee: true }))).toEqual({ ok: false, reason: 'REJECTED_TASK' });
  });

  it('lets the assignee or a team manager start a task, and nobody else', () => {
    expect(move('todo', 'in_progress', as({ isAssignee: true }))).toMatchObject({ ok: true, to: 'in_progress' });
    expect(move('todo', 'in_progress', as({ isTeamManager: true }))).toMatchObject({ ok: true });
    expect(move('todo', 'in_progress', as({ isCreator: true, isReviewer: true }))).toEqual({ ok: false, reason: 'NOT_ASSIGNEE' });
  });

  it('finishes a task, or sends one that needs review to awaiting review', () => {
    expect(move('in_progress', 'done', as({ isAssignee: true }))).toMatchObject({ ok: true, to: 'done', finishes: true });
    expect(move('in_progress', 'done', as({ isAssignee: true }), true)).toMatchObject({ ok: true, to: 'awaiting_review', finishes: false });
    expect(move('in_progress', 'awaiting_review', as({ isAssignee: true }), true)).toMatchObject({ ok: true, to: 'awaiting_review' });
    expect(move('in_progress', 'awaiting_review', as({ isAssignee: true }), false)).toEqual({ ok: false, reason: 'REVIEW_NOT_REQUIRED' });
    expect(move('in_progress', 'done', as({ isCreator: true }))).toEqual({ ok: false, reason: 'NOT_ASSIGNEE' });
  });

  it('leaves the review step to the reviewer alone, and a send-back needs a note', () => {
    expect(move('awaiting_review', 'done', as({ isReviewer: true }), true)).toMatchObject({ ok: true, to: 'done', finishes: true });
    expect(move('awaiting_review', 'in_progress', as({ isReviewer: true }), true)).toMatchObject({ ok: true, to: 'in_progress', needsNote: true });
    expect(move('awaiting_review', 'done', as({ isAssignee: true, isTeamManager: true, isCreator: true }), true)).toEqual({ ok: false, reason: 'NOT_REVIEWER' });
    expect(move('awaiting_review', 'todo', as({ isReviewer: true }), true)).toEqual({ ok: false, reason: 'NOT_ALLOWED_PATH' });
  });

  it('reopens a finished task for who gave it or a manager, never for the assignee alone', () => {
    expect(move('done', 'in_progress', as({ isCreator: true }))).toMatchObject({ ok: true, reopens: true });
    expect(move('done', 'todo', as({ isTeamManager: true }))).toMatchObject({ ok: true, reopens: true });
    expect(move('done', 'awaiting_review', as({ isCreator: true }), true)).toMatchObject({ ok: true });
    expect(move('done', 'awaiting_review', as({ isCreator: true }), false)).toEqual({ ok: false, reason: 'NOT_ALLOWED_PATH' });
    expect(move('done', 'in_progress', as({ isAssignee: true }))).toEqual({ ok: false, reason: 'NOT_CREATOR_OR_MANAGER' });
  });

  it('refuses a move to the same status and the paths the table does not list', () => {
    expect(move('todo', 'todo', as({ isAssignee: true }))).toEqual({ ok: false, reason: 'NO_CHANGE' });
    expect(move('todo', 'done', as({ isAssignee: true }))).toEqual({ ok: false, reason: 'NOT_ALLOWED_PATH' });
    expect(move('in_progress', 'todo', as({ isAssignee: true }))).toEqual({ ok: false, reason: 'NOT_ALLOWED_PATH' });
  });

  it('lists what an actor may move a task to', () => {
    expect(reachableStatuses('todo', false, as({ isAssignee: true }))).toEqual(['in_progress']);
    expect(reachableStatuses('in_progress', true, as({ isAssignee: true }))).toEqual(['awaiting_review', 'done']);
    expect(reachableStatuses('pending_approval', false, as({ isAssignee: true, isTeamManager: true }))).toEqual([]);
  });
});
