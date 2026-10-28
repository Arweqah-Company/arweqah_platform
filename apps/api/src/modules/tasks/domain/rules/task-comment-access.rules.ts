import { COMMENT_ACTION_KEYS, OUTSIDE_RELATIONS, type CommentAction, type CommentRelation, type CommentRuleMatrix } from '@arweqah-platform/shared';

/** What the rules need to know about a person and a task; the facts that need a query arrive already answered. */
export interface CommentFacts {
  userId: string;
  assigneeUserId: string;
  creatorUserId: string;
  approverUserId: string | null;
  reviewerUserId: string | null;
  isFollowing: boolean;
  /** The person's team-view scope reaches the assignee. */
  isTeamManager: boolean;
  /** The person has an open task of the same category as this one. */
  isCategoryPeer: boolean;
  /** A comment of this task names the person. */
  isMentioned: boolean;
}

/** Every relation the person has to the task (a person may have several). */
export const commentRelations = (f: CommentFacts): CommentRelation[] => {
  const relations: CommentRelation[] = [];
  if (f.assigneeUserId === f.userId) relations.push('assignee');
  if (f.creatorUserId === f.userId) relations.push('creator');
  if (f.approverUserId === f.userId) relations.push('approver');
  if (f.reviewerUserId === f.userId) relations.push('reviewer');
  if (f.isFollowing) relations.push('follower');
  if (f.isTeamManager) relations.push('manager');
  if (f.isCategoryPeer) relations.push('category_peer');
  if (f.isMentioned) relations.push('mentioned');
  return relations;
};

/** Somebody who is not a party of the task: they reach the conversation and nothing else of it. */
export const isOutsider = (relations: readonly CommentRelation[]): boolean => relations.length > 0 && relations.every((r) => OUTSIDE_RELATIONS.includes(r));

/** An action passes when the person's role holds its key **and** a cell of the matrix is on for one of their relations. */
export const mayDo = (input: { action: CommentAction; relations: readonly CommentRelation[]; holdsKey: (key: string) => boolean; matrix: CommentRuleMatrix }): boolean =>
  input.holdsKey(COMMENT_ACTION_KEYS[input.action]) && input.relations.some((relation) => input.matrix[relation][input.action]);

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

/** Is a comment still inside the minutes its author may change or delete it in? */
export const withinEditWindow = (createdAt: Date, now: Date, minutes: number): boolean => now.getTime() - createdAt.getTime() <= minutes * MINUTE_MS;

/** An archived task is read-only; after `lockDays` days past its closing the conversation closes too (0 = never). */
export const isConversationClosed = (input: { archived: boolean; completedAt: Date | null; lockDays: number; now: Date }): boolean => {
  if (input.archived) return true;
  return input.lockDays > 0 && input.completedAt !== null && input.now.getTime() - input.completedAt.getTime() >= input.lockDays * DAY_MS;
};

export const hasContent = (body: string, fileCount: number): boolean => body.trim().length > 0 || fileCount > 0;
