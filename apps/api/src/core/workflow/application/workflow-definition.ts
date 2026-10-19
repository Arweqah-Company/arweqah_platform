import { Injectable } from '@nestjs/common';
import type { AnyStateMachine } from 'xstate';

/**
 * A feature module declares its process as an XState machine. States may carry
 * `meta: { timeout: { afterMs, event } }`; the engine turns that into a durable
 * scheduled job (XState's own `after` timers do not survive restarts).
 */
export interface WorkflowDefinition {
  key: string;
  version: number;
  machine: AnyStateMachine;
}

export interface StateTimeoutMeta {
  timeout?: { afterMs: number; event: string };
}

@Injectable()
export class WorkflowRegistry {
  private readonly definitions = new Map<string, WorkflowDefinition>();

  register(definition: WorkflowDefinition): void {
    if (this.definitions.has(definition.key)) throw new Error(`Duplicate workflow ${definition.key}`);
    this.definitions.set(definition.key, definition);
  }

  get(key: string): WorkflowDefinition {
    const definition = this.definitions.get(key);
    if (!definition) throw new Error(`Unknown workflow ${key}`);
    return definition;
  }
}
