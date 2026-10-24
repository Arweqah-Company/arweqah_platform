import { Injectable, OnModuleInit } from '@nestjs/common';
import { MessageBus } from '../../../../core/messaging/application/message-bus';
import { IdempotencyGuard } from '../../../../core/messaging/application/outbox';
import { TASK_TOPICS } from '../../application/messages/task.messages';
import { TaskObjectionService } from '../../application/services/task-objection.service';

const CONSUMER = 'tasks-objection';

/** The durable job scheduled with every objection: when its time ends and nobody answered, the objection lapses. */
@Injectable()
export class TaskObjectionExpiryJob implements OnModuleInit {
  constructor(
    private readonly bus: MessageBus,
    private readonly idempotency: IdempotencyGuard,
    private readonly objections: TaskObjectionService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.bus.subscribe<{ objectionId: string; taskId: string }>(CONSUMER, TASK_TOPICS.objectionExpiry, async (msg) => {
      await this.idempotency.once(CONSUMER, msg.id, async () => {
        await this.objections.expire(msg.payload.objectionId, msg.payload.taskId);
      });
    });
  }
}
