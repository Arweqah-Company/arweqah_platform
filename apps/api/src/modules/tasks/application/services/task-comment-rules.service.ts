import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { CommentRulesDto, CommentRulesInput } from '@arweqah-platform/shared';
import { TransactionRunner } from '../../../../common/application/transaction-runner';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import { TaskCommentRepository } from '../../domain/contracts/task-comment.repository';
import { TaskPolicyService } from './task-policy.service';
import { TASK_AUDIT } from '../messages/task.messages';

/** The matrix of who may do what in the conversations of a company's tasks (an administrator page, with the task policies). */
@Injectable()
export class TaskCommentRulesService {
  constructor(
    private readonly comments: TaskCommentRepository,
    private readonly policies: TaskPolicyService,
    private readonly tx: TransactionRunner,
    private readonly events: EventEmitter2,
  ) {}

  async get(companyId: string | null | undefined, ownCompanyId: string | null): Promise<CommentRulesDto> {
    const company = await this.policies.companyOf(companyId, ownCompanyId);
    return { companyId: company, rules: await this.comments.rules(company) };
  }

  async update(actorId: string, companyId: string | null | undefined, ownCompanyId: string | null, input: CommentRulesInput): Promise<CommentRulesDto> {
    const company = await this.policies.companyOf(companyId, ownCompanyId);
    await this.tx.run((tx) => this.comments.saveRules(company, input.rules, tx));
    const event: AuditEvent = { actorId, action: TASK_AUDIT.commentRulesChanged, entityType: 'task_comment_rules', entityId: company, changes: {} };
    this.events.emit(AUDIT_EVENT, event);
    return this.get(company, ownCompanyId);
  }
}
