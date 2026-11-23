import { Injectable } from '@nestjs/common';
import type { TransactionContext } from '../../../../common/application/transaction-runner';
import { WorkflowEngine } from '../../../../core/workflow/application/workflow-engine';
import { NOTICE_WORKFLOW_KEY, type NoticeEvent } from '../../domain/rules/notice-machine';

const ENTITY = 'notice';

/** The state machine of a notice, run by the workflow engine: its history is the timeline of the details window (who sent, approved, rejected, published). */
@Injectable()
export class NoticeWorkflow {
  constructor(private readonly engine: WorkflowEngine) {}

  start(noticeId: string, actorId: string, tx: TransactionContext): Promise<unknown> {
    return this.engine.start({ definitionKey: NOTICE_WORKFLOW_KEY, entityType: ENTITY, entityId: noticeId, actorId, tx });
  }

  /** `comment` carries the reason of a rejection, or the number of the version a new version or its cancellation is about. */
  async send(noticeId: string, event: NoticeEvent, by: { actorId: string | null; tx: TransactionContext; comment?: string }): Promise<void> {
    const instance = await this.engine.findByEntity(ENTITY, noticeId);
    if (instance) await this.engine.send({ instanceId: instance.id, event, actorId: by.actorId, comment: by.comment, tx: by.tx });
  }
}
