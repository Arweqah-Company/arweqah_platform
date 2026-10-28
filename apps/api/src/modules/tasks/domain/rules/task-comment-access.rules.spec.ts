import { COMMENT_ACTIONS, COMMENT_RELATIONS, CorePermission, defaultCommentMatrix, mentionedIn } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { commentRelations, hasContent, isConversationClosed, isOutsider, mayDo, withinEditWindow, type CommentFacts } from './task-comment-access.rules';

const facts = (over: Partial<CommentFacts> = {}): CommentFacts => ({
  userId: 'me', assigneeUserId: 'a', creatorUserId: 'c', approverUserId: 'p', reviewerUserId: 'r', isFollowing: false, isTeamManager: false, isCategoryPeer: false, isMentioned: false, ...over,
});
const holdsAll = () => true;

describe('Task comment access (FR-66)', () => {
  it('finds every relation of a person, and none for a stranger', () => {
    expect(commentRelations(facts())).toEqual([]);
    expect(commentRelations(facts({ assigneeUserId: 'me', isFollowing: true, isTeamManager: true }))).toEqual(['assignee', 'follower', 'manager']);
    expect(commentRelations(facts({ approverUserId: 'me', reviewerUserId: 'me', creatorUserId: 'me' }))).toEqual(['creator', 'approver', 'reviewer']);
    expect(commentRelations(facts({ isCategoryPeer: true, isMentioned: true }))).toEqual(['category_peer', 'mentioned']);
  });

  it('calls someone an outsider only when every relation of theirs is a colleague of the category or a mention', () => {
    expect(isOutsider([])).toBe(false);
    expect(isOutsider(['category_peer'])).toBe(true);
    expect(isOutsider(['mentioned', 'category_peer'])).toBe(true);
    expect(isOutsider(['mentioned', 'follower'])).toBe(false);
  });

  it('needs both the key and a cell of one of the relations', () => {
    const matrix = defaultCommentMatrix();
    expect(mayDo({ action: 'write', relations: ['assignee'], holdsKey: holdsAll, matrix })).toBe(true);
    expect(mayDo({ action: 'write', relations: ['assignee'], holdsKey: (k) => k !== CorePermission.TasksCommentAdd, matrix })).toBe(false);
    expect(mayDo({ action: 'upload', relations: ['category_peer'], holdsKey: holdsAll, matrix })).toBe(false);
    expect(mayDo({ action: 'upload', relations: ['category_peer', 'follower'], holdsKey: holdsAll, matrix })).toBe(true);
    expect(mayDo({ action: 'read', relations: [], holdsKey: holdsAll, matrix })).toBe(false);
  });

  it('follows a matrix an administrator changed', () => {
    const matrix = defaultCommentMatrix();
    matrix.follower.write = false;
    expect(mayDo({ action: 'write', relations: ['follower'], holdsKey: holdsAll, matrix })).toBe(false);
    expect(mayDo({ action: 'read', relations: ['follower'], holdsKey: holdsAll, matrix })).toBe(true);
  });

  it('starts with the parties allowed everything and the outside relations limited to read, write and reply', () => {
    const matrix = defaultCommentMatrix();
    for (const action of COMMENT_ACTIONS) expect(matrix.assignee[action]).toBe(true);
    expect(COMMENT_RELATIONS.length).toBe(8);
    expect(Object.entries(matrix.mentioned).filter(([, on]) => on).map(([a]) => a)).toEqual(['read', 'write', 'reply']);
  });

  it('keeps the edit window by minutes', () => {
    const created = new Date('2026-10-28T10:00:00Z');
    expect(withinEditWindow(created, new Date('2026-10-28T10:15:00Z'), 15)).toBe(true);
    expect(withinEditWindow(created, new Date('2026-10-28T10:15:01Z'), 15)).toBe(false);
    expect(withinEditWindow(created, new Date('2026-10-28T10:00:01Z'), 0)).toBe(false);
  });

  it('closes the conversation when the task is archived or the lock days passed', () => {
    const now = new Date('2026-10-28T10:00:00Z');
    const base = { archived: false, completedAt: new Date('2026-10-20T10:00:00Z'), lockDays: 0, now };
    expect(isConversationClosed(base)).toBe(false);
    expect(isConversationClosed({ ...base, archived: true })).toBe(true);
    expect(isConversationClosed({ ...base, lockDays: 7 })).toBe(true);
    expect(isConversationClosed({ ...base, lockDays: 9 })).toBe(false);
    expect(isConversationClosed({ ...base, lockDays: 7, completedAt: null })).toBe(false);
  });

  it('asks for some text or a file, and reads mentions once each', () => {
    expect(hasContent('  ', 0)).toBe(false);
    expect(hasContent('', 1)).toBe(true);
    const id = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
    expect(mentionedIn(`hi {{mention:${id}}} and {{mention:${id.toUpperCase()}}}`)).toEqual([id]);
    expect(mentionedIn('no mention {{mention:not-a-uuid}}')).toEqual([]);
  });
});
