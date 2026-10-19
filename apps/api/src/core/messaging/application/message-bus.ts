export interface BusMessage<T = Record<string, unknown>> {
  id: string;
  topic: string;
  payload: T;
}

export type MessageHandler<T = Record<string, unknown>> = (message: BusMessage<T>) => Promise<void>;

/**
 * Asynchronous messaging between modules and workers (Adapter over RabbitMQ).
 * Application code publishes through the Outbox, never directly, so a message
 * is sent only if its transaction committed.
 */
export abstract class MessageBus {
  abstract publish(message: BusMessage): Promise<void>;
  /** `consumer` names a durable queue; each consumer gets its own copy of a topic. */
  abstract subscribe<T>(consumer: string, topic: string, handler: MessageHandler<T>): Promise<void>;
}
