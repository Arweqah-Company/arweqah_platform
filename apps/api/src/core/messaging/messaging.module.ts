import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfig } from '../../config/app-config.service';
import { MessageBus } from './application/message-bus';
import { IdempotencyGuard, JobScheduler, Outbox } from './application/outbox';
import { OutboxMessage } from './domain/outbox-message.entity';
import { ProcessedMessage } from './domain/processed-message.entity';
import { ScheduledJob } from './domain/scheduled-job.entity';
import { InMemoryMessageBus } from './infrastructure/in-memory-message-bus';
import { RabbitMqMessageBus } from './infrastructure/rabbitmq-message-bus';
import { ScheduledJobRelay, TypeOrmJobScheduler } from './infrastructure/typeorm-job-scheduler';
import { OutboxRelay, TypeOrmIdempotencyGuard, TypeOrmOutbox } from './infrastructure/typeorm-outbox';

/** Outbox + RabbitMQ + durable scheduled jobs. */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([OutboxMessage, ScheduledJob, ProcessedMessage])],
  providers: [
    {
      provide: MessageBus,
      inject: [AppConfig],
      useFactory: (config: AppConfig) =>
        config.get('MESSAGE_BUS') === 'memory' ? new InMemoryMessageBus() : new RabbitMqMessageBus(config),
    },
    { provide: Outbox, useClass: TypeOrmOutbox },
    { provide: JobScheduler, useClass: TypeOrmJobScheduler },
    { provide: IdempotencyGuard, useClass: TypeOrmIdempotencyGuard },
    OutboxRelay,
    ScheduledJobRelay,
  ],
  exports: [MessageBus, Outbox, JobScheduler, IdempotencyGuard, OutboxRelay, ScheduledJobRelay],
})
export class MessagingModule {}
