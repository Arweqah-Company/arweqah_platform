import { Injectable, OnModuleInit } from '@nestjs/common';
import { MessageBus } from '../../../../core/messaging/application/message-bus';
import { IdempotencyGuard } from '../../../../core/messaging/application/outbox';
import { WORKFLOW_TRANSITIONED, type WorkflowTransitionedPayload } from '../../../../core/workflow/application/workflow.topics';
import { CareerRequestDecisionService } from '../../application/services/career-request-decision.service';

const CONSUMER = 'career-request-escalation';

/** Reacts to every committed transition of the workflow engine: a development request that went up because the direct manager did not answer is moved to its next approver. */
@Injectable()
export class CareerRequestEscalationConsumer implements OnModuleInit {
  constructor(
    private readonly bus: MessageBus,
    private readonly idempotency: IdempotencyGuard,
    private readonly decisions: CareerRequestDecisionService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.bus.subscribe<WorkflowTransitionedPayload>(CONSUMER, WORKFLOW_TRANSITIONED, async (msg) => {
      await this.idempotency.once(CONSUMER, msg.id, () => this.decisions.onTransitioned(msg.payload));
    });
  }
}
