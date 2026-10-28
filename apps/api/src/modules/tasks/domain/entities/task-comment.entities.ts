import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';

/** A comment on a task, or a reply to one (one level only: `parentId` is always a first-level comment). The text is kept when a comment is deleted. */
@Entity('task_comments')
@Index('IDX_task_comments_task', ['taskId', 'createdAt'])
export class TaskComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'task_id', type: 'uuid' })
  taskId: string;

  @Column({ name: 'author_user_id', type: 'uuid' })
  authorUserId: string;

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId: string | null;

  @Column({ name: 'reply_to_user_id', type: 'uuid', nullable: true })
  replyToUserId: string | null;

  @Column({ type: 'text', default: '' })
  body: string;

  @Column({ name: 'edited_at', type: 'timestamptz', nullable: true })
  editedAt: Date | null;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @Column({ name: 'deleted_by_user_id', type: 'uuid', nullable: true })
  deletedByUserId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne('Task', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id', foreignKeyConstraintName: 'FK_task_comments_task' })
  private readonly taskFk?: unknown;

  @ManyToOne('User')
  @JoinColumn({ name: 'author_user_id', foreignKeyConstraintName: 'FK_task_comments_author' })
  private readonly authorFk?: unknown;

  @ManyToOne('TaskComment', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_id', foreignKeyConstraintName: 'FK_task_comments_parent' })
  private readonly parentFk?: unknown;
}

@Entity('task_comment_files')
export class TaskCommentFile {
  @PrimaryColumn({ name: 'comment_id', type: 'uuid' })
  commentId: string;

  @PrimaryColumn({ name: 'file_id', type: 'uuid' })
  fileId: string;

  @ManyToOne('TaskComment', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'comment_id', foreignKeyConstraintName: 'FK_task_comment_files_comment' })
  private readonly commentFk?: unknown;

  @ManyToOne('StoredFile')
  @JoinColumn({ name: 'file_id', foreignKeyConstraintName: 'FK_task_comment_files_file' })
  private readonly fileFk?: unknown;
}

@Entity('task_comment_mentions')
@Index('IDX_task_comment_mentions_user', ['userId'])
export class TaskCommentMention {
  @PrimaryColumn({ name: 'comment_id', type: 'uuid' })
  commentId: string;

  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne('TaskComment', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'comment_id', foreignKeyConstraintName: 'FK_task_comment_mentions_comment' })
  private readonly commentFk?: unknown;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_task_comment_mentions_user' })
  private readonly userFk?: unknown;
}

/** One cell of a company's matrix: may this relation do this action in a task's conversation. A company with no rows has the defaults. */
@Entity('task_comment_rules')
export class TaskCommentRule {
  @PrimaryColumn({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @PrimaryColumn({ type: 'varchar', length: 20 })
  relation: string;

  @PrimaryColumn({ type: 'varchar', length: 20 })
  action: string;

  @Column({ type: 'boolean' })
  allowed: boolean;

  @ManyToOne('Company', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id', foreignKeyConstraintName: 'FK_task_comment_rules_company' })
  private readonly companyFk?: unknown;
}

export const TASK_COMMENT_ENTITIES = [TaskComment, TaskCommentFile, TaskCommentMention, TaskCommentRule];
