import { z } from 'zod';
import { CorePermission } from '../permissions/keys';

/** How a person stands to a task. A colleague of the category and a mentioned person are not parties: they reach the conversation only. */
export const COMMENT_RELATIONS = ['assignee', 'creator', 'approver', 'reviewer', 'follower', 'manager', 'category_peer', 'mentioned'] as const;
export type CommentRelation = (typeof COMMENT_RELATIONS)[number];

/** What a person may do in the conversation. Each action is also a permission key (`COMMENT_ACTION_KEYS`). */
export const COMMENT_ACTIONS = ['read', 'write', 'reply', 'upload', 'mention', 'edit_own', 'delete_own'] as const;
export type CommentAction = (typeof COMMENT_ACTIONS)[number];

/** The key an action needs in the person's role, on top of the matrix cell of one of their relations. */
export const COMMENT_ACTION_KEYS: Record<CommentAction, string> = {
  read: CorePermission.TasksCommentView,
  write: CorePermission.TasksCommentAdd,
  reply: CorePermission.TasksCommentReply,
  upload: CorePermission.TasksCommentUpload,
  mention: CorePermission.TasksCommentMention,
  edit_own: CorePermission.TasksCommentEdit,
  delete_own: CorePermission.TasksCommentDelete,
};

/** The relations that are not parties of the task: they see its number, title and conversation, nothing else. */
export const OUTSIDE_RELATIONS: readonly CommentRelation[] = ['category_peer', 'mentioned'];

export type CommentRuleMatrix = Record<CommentRelation, Record<CommentAction, boolean>>;

/** What a company starts with: the parties may do everything, the outside relations read, write and reply. */
export const defaultCommentMatrix = (): CommentRuleMatrix => {
  const matrix = {} as CommentRuleMatrix;
  for (const relation of COMMENT_RELATIONS) {
    const outside = OUTSIDE_RELATIONS.includes(relation);
    matrix[relation] = Object.fromEntries(COMMENT_ACTIONS.map((action) => [action, !outside || ['read', 'write', 'reply'].includes(action)])) as Record<CommentAction, boolean>;
  }
  return matrix;
};

export const MAX_COMMENT_TEXT = 5000;

/** A mention is stored in the text as `{{mention:<user id>}}`; the screen shows the person's name instead. */
export const MENTION_TOKEN = /\{\{mention:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\}\}/gi;

/** The user ids a text mentions, each once. */
export const mentionedIn = (body: string): string[] => [...new Set([...body.matchAll(MENTION_TOKEN)].map((m) => (m[1] ?? '').toLowerCase()))];

const body = z.string().trim().max(MAX_COMMENT_TEXT);

export const createCommentSchema = z.strictObject({ body: body.default(''), fileIds: z.array(z.uuid()).max(10).default([]) });
export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export const replyCommentSchema = createCommentSchema.extend({ replyToUserId: z.uuid().optional() });
export type ReplyCommentInput = z.infer<typeof replyCommentSchema>;

export const editCommentSchema = z.strictObject({ body: body.min(1) });
export type EditCommentInput = z.infer<typeof editCommentSchema>;

export const mentionablesQuerySchema = z.strictObject({ search: z.string().trim().max(100).optional() });
export type MentionablesQuery = z.infer<typeof mentionablesQuerySchema>;

/** One cell per relation and action; every cell must be present (the whole matrix is saved at once). */
export const commentRulesInputSchema = z.strictObject({
  rules: z.strictObject(Object.fromEntries(COMMENT_RELATIONS.map((r) => [r, z.strictObject(Object.fromEntries(COMMENT_ACTIONS.map((a) => [a, z.boolean()])))]))),
});
export type CommentRulesInput = { rules: CommentRuleMatrix };

// ------------------------------------------------------------------ read models

export interface CommentPersonDto {
  id: string;
  name: string;
}

export interface CommentFileDto {
  id: string;
  name: string;
  size: number;
  contentType: string;
}

export interface TaskCommentDto {
  id: string;
  parentId: string | null;
  author: CommentPersonDto;
  /** The person this reply answers (a reply to a reply points at the first comment, naming who it answers). */
  replyTo: CommentPersonDto | null;
  /** The text with `{{mention:id}}` tokens; empty for a deleted comment. */
  body: string;
  mentions: CommentPersonDto[];
  files: CommentFileDto[];
  createdAt: string;
  isEdited: boolean;
  isDeleted: boolean;
  mayEdit: boolean;
  mayDelete: boolean;
}

/** What the conversation of one task shows: for a person outside the task only its number and title come with it. */
export interface TaskConversationDto {
  task: { id: string; number: string; title: string };
  comments: TaskCommentDto[];
  /** What this person may do now (the key, the matrix, the task being open and its lock all counted). */
  can: Record<'write' | 'reply' | 'upload' | 'mention', boolean>;
  maxFiles: number;
  locked: boolean;
  isOutsider: boolean;
}

export interface CommentRulesDto {
  companyId: string;
  rules: CommentRuleMatrix;
}

export interface MentionableDto extends CommentPersonDto {
  email: string;
}
