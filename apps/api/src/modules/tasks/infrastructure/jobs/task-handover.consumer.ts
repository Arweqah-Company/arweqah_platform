import { Injectable, OnModuleInit } from '@nestjs/common';
import { EMPLOYEE_TERMINATED_TOPIC, type EmployeeTerminatedPayload } from '@arweqah-platform/shared';
import { MessageBus } from '../../../../core/messaging/application/message-bus';
import { IdempotencyGuard } from '../../../../core/messaging/application/outbox';
import { TASK_TOPICS } from '../../application/messages/task.messages';
import { TaskHandoverService } from '../../application/services/task-handover.service';

const CONSUMER = 'tasks-handover';

/** Reacts to an employee leaving (decided when HR ends the service, carried out on the last day) with each message handled once. */
@Injectable()
export class TaskHandoverConsumer implements OnModuleInit {
  constructor(
    private readonly bus: MessageBus,
    private readonly idempotency: IdempotencyGuard,
    private readonly handover: TaskHandoverService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.bus.subscribe<EmployeeTerminatedPayload>(CONSUMER, EMPLOYEE_TERMINATED_TOPIC, async (msg) => {
      await this.idempotency.once(CONSUMER, msg.id, () => this.handover.onTerminated(msg.payload));
    });
    await this.bus.subscribe<{ userId: string }>(CONSUMER, TASK_TOPICS.handover, async (msg) => {
      await this.idempotency.once(CONSUMER, msg.id, async () => {
        await this.handover.handOver(msg.payload.userId);
      });
    });
  }
}
