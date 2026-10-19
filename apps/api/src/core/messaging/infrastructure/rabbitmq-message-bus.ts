import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import amqp, { type AmqpConnectionManager, type ChannelWrapper } from 'amqp-connection-manager';
import type { Channel, ConsumeMessage } from 'amqplib';
import { AppConfig } from '../../../config/app-config.service';
import { MessageBus, type BusMessage, type MessageHandler } from '../application/message-bus';

const EXCHANGE = 'arweqah.events';
const DEAD_LETTER_EXCHANGE = 'arweqah.dlx';
const PREFETCH = 10;

/** RabbitMQ adapter: durable topic exchange, one durable queue per consumer, DLQ on failure. */
@Injectable()
export class RabbitMqMessageBus extends MessageBus implements OnModuleDestroy {
  private readonly logger = new Logger(RabbitMqMessageBus.name);
  private readonly connection: AmqpConnectionManager;
  private readonly publisher: ChannelWrapper;

  constructor(config: AppConfig) {
    super();
    this.connection = amqp.connect([config.get('RABBITMQ_URL')]);
    this.connection.on('disconnect', ({ err }) => this.logger.warn(`RabbitMQ disconnected: ${err?.message}`));
    this.publisher = this.connection.createChannel({
      json: false,
      setup: (ch: Channel) => declareExchanges(ch),
    });
  }

  async publish(message: BusMessage): Promise<void> {
    await this.publisher.publish(EXCHANGE, message.topic, Buffer.from(JSON.stringify(message.payload)), {
      persistent: true,
      messageId: message.id,
      contentType: 'application/json',
    });
  }

  async subscribe<T>(consumer: string, topic: string, handler: MessageHandler<T>): Promise<void> {
    const queue = `${consumer}.${topic}`;
    // Not awaited: the consumer attaches as soon as the broker is reachable, so the API
    // can boot during a broker outage; the outbox keeps events until then.
    this.connection.createChannel({
      setup: async (ch: Channel) => {
        await declareExchanges(ch);
        await ch.assertQueue(`${queue}.dlq`, { durable: true });
        await ch.bindQueue(`${queue}.dlq`, DEAD_LETTER_EXCHANGE, queue);
        await ch.assertQueue(queue, {
          durable: true,
          deadLetterExchange: DEAD_LETTER_EXCHANGE,
          deadLetterRoutingKey: queue,
        });
        await ch.bindQueue(queue, EXCHANGE, topic);
        await ch.prefetch(PREFETCH);
        await ch.consume(queue, (msg) => msg && void this.handle(ch, msg, handler as MessageHandler));
      },
    });
  }

  isConnected(): boolean {
    return this.connection.isConnected();
  }

  private async handle(ch: Channel, msg: ConsumeMessage, handler: MessageHandler): Promise<void> {
    try {
      const payload = JSON.parse(msg.content.toString()) as Record<string, unknown>;
      await handler({ id: String(msg.properties.messageId), topic: msg.fields.routingKey, payload });
      ch.ack(msg);
    } catch (error) {
      this.logger.error(`Handler failed for ${msg.fields.routingKey}; moved to DLQ`, error as Error);
      ch.nack(msg, false, false);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.connection.close();
  }
}

async function declareExchanges(ch: Channel): Promise<void> {
  await ch.assertExchange(EXCHANGE, 'topic', { durable: true });
  await ch.assertExchange(DEAD_LETTER_EXCHANGE, 'direct', { durable: true });
}
