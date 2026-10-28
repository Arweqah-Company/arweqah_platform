export interface CommentRow {
  id: string;
  taskId: string;
  parentId: string | null;
  authorUserId: string;
  authorName: string;
  replyToUserId: string | null;
  replyToName: string | null;
  body: string;
  editedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
}

export interface CommentMentionRow {
  commentId: string;
  userId: string;
  name: string;
}

export interface CommentFileRow {
  commentId: string;
  fileId: string;
  name: string;
  size: number;
  contentType: string;
}

export interface NewComment {
  taskId: string;
  authorUserId: string;
  parentId: string | null;
  replyToUserId: string | null;
  body: string;
  mentionIds: string[];
  fileIds: string[];
}

export interface CommentEdit {
  body: string;
  editedAt: Date;
  mentionIds: string[];
}
