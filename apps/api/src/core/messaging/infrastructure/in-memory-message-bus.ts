import { Injectable } from '@nestjs/common';
import { MessageBus, type BusMessage, type MessageHandler } from '../application/message-bus';

/** Used in tests and local runs without RabbitMQ (MESSAGE_BUS=memory). */
@Injectable()
export class InMemoryMessageBus extends MessageBus {
  private readonly handlers = new Map<string, MessageHandler[]>();
  readonly published: BusMessage[] = [];
  /** Like RabbitMQ's DLQ: a failing consumer never fails the publisher. */
  readonly deadLetters: { message: BusMessage; error: unknown }[] = [];

  async publish(message: BusMessage): Promise<void> {
    this.published.push(message);
    for (const handler of this.handlers.get(message.topic) ?? []) {
      try {
        await handler(message);
      } catch (error) {
        this.deadLetters.push({ message, error });
      }
    }
  }

  async subscribe<T>(_consumer: string, topic: string, handler: MessageHandler<T>): Promise<void> {
    this.handlers.set(topic, [...(this.handlers.get(topic) ?? []), handler as MessageHandler]);
  }
}
