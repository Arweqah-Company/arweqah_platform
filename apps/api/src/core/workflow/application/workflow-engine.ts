import { Injectable, OnModuleInit } from '@nestjs/common';
import { createActor, type AnyMachineSnapshot, type EventObject, type Snapshot } from 'xstate';
import { NotFoundError } from '../../../common/domain/domain-error';
import { TransactionRunner, type TransactionContext } from '../../../common/application/transaction-runner';
import { Clock } from '../../../common/application/clock';
import { MessageBus } from '../../messaging/application/message-bus';
import { IdempotencyGuard, JobScheduler, Outbox } from '../../messaging/application/outbox';
import { WorkflowInstance, type WorkflowTransition } from '../domain/workflow-instance.entity';
import { WorkflowRepository } from '../domain/workflow.repository';
import { TransitionNotAllowedError, WorkflowConcurrencyError } from '../domain/errors';
import { WorkflowRegistry, type StateTimeoutMeta, type WorkflowDefinition } from './workflow-definition';
import { WORKFLOW_TIMEOUT, WORKFLOW_TRANSITIONED, type WorkflowTransitionedPayload } from './workflow.topics';

export interface StartWorkflow {
  definitionKey: string;
  entityType: string;
  entityId: string;
  actorId: string | null;
  input?: Record<string, unknown>;
  tx?: TransactionContext;
}

export interface SendWorkflowEvent {
  instanceId: string;
  event: EventObject;
  actorId: string | null;
  comment?: string;
  tx?: TransactionContext;
}

/** Runs XState machines with state persisted in PostgreSQL and timeouts in scheduled_jobs. */
@Injectable()
export class WorkflowEngine implements OnModuleInit {
  constructor(
    private readonly registry: WorkflowRegistry,
    private readonly repo: WorkflowRepository,
    private readonly tx: TransactionRunner,
    private readonly outbox: Outbox,
    private readonly scheduler: JobScheduler,
    private readonly bus: MessageBus,
    private readonly idempotency: IdempotencyGuard,
    private readonly clock: Clock,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.bus.subscribe<{ instanceId: string; state: string; event: string; jobId: string }>(
      'workflow-engine',
      WORKFLOW_TIMEOUT,
      async (msg) => {
        await this.idempotency.once('workflow-engine', msg.id, () => this.onTimeout(msg.payload));
      },
    );
  }

  async start(cmd: StartWorkflow): Promise<WorkflowInstance> {
    const definition = this.registry.get(cmd.definitionKey);
    const actor = createActor(definition.machine, { input: cmd.input });
    actor.start();
    const snapshot = actor.getSnapshot() as AnyMachineSnapshot;
    const instance = Object.assign(new WorkflowInstance(), {
      definitionKey: definition.key,
      definitionVersion: definition.version,
      entityType: cmd.entityType,
      entityId: cmd.entityId,
      state: stateName(snapshot),
      isDone: snapshot.status === 'done',
      snapshot: actor.getPersistedSnapshot() as unknown as Record<string, unknown>,
      startedBy: cmd.actorId,
      revision: 1,
    });
    actor.stop();
    return this.within(cmd.tx, async (tx) => {
      const saved = await this.repo.insert(instance, tx);
      await this.scheduleTimeout(saved, snapshot, tx);
      return saved;
    });
  }

  async send(cmd: SendWorkflowEvent): Promise<WorkflowInstance> {
    return this.within(cmd.tx, async (tx) => {
      const instance = await this.repo.findById(cmd.instanceId, tx);
      if (!instance) throw new NotFoundError('Workflow', cmd.instanceId);
      const definition = this.registry.get(instance.definitionKey);
      const { before, after } = this.transition(definition, instance, cmd.event);
      const from = instance.state;
      const expected = instance.revision;
      Object.assign(instance, {
        state: stateName(after.snapshot),
        isDone: after.snapshot.status === 'done',
        snapshot: after.persisted,
        revision: expected + 1,
      });
      if (!(await this.repo.updateIfRevision(instance, expected, tx))) throw new WorkflowConcurrencyError();
      await this.repo.addTransition(
        { instanceId: instance.id, event: cmd.event.type, fromState: from, toState: instance.state, actorId: cmd.actorId, comment: cmd.comment ?? null },
        tx,
      );
      await this.afterTransition({ instance, cmd, from, stateChanged: before !== instance.state, snapshot: after.snapshot, tx });
      return instance;
    });
  }

  /** Events the current state accepts, for showing the right buttons in the UI. */
  async availableEvents(instanceId: string, candidates: string[]): Promise<string[]> {
    const instance = await this.repo.findById(instanceId);
    if (!instance) throw new NotFoundError('Workflow', instanceId);
    const snapshot = this.restore(this.registry.get(instance.definitionKey), instance);
    return candidates.filter((type) => snapshot.can({ type }));
  }

  history(instanceId: string): Promise<WorkflowTransition[]> {
    return this.repo.history(instanceId);
  }

  findByEntity(entityType: string, entityId: string): Promise<WorkflowInstance | null> {
    return this.repo.findByEntity(entityType, entityId);
  }

  private transition(definition: WorkflowDefinition, instance: WorkflowInstance, event: EventObject) {
    if (!this.restore(definition, instance).can(event)) {
      throw new TransitionNotAllowedError(event.type, instance.state);
    }
    const actor = createActor(definition.machine, { snapshot: instance.snapshot as unknown as Snapshot<unknown> });
    actor.start();
    actor.send(event);
    const snapshot = actor.getSnapshot() as AnyMachineSnapshot;
    const persisted = actor.getPersistedSnapshot() as unknown as Record<string, unknown>;
    actor.stop();
    return { before: instance.state, after: { snapshot, persisted } };
  }

  private restore(definition: WorkflowDefinition, instance: WorkflowInstance): AnyMachineSnapshot {
    const actor = createActor(definition.machine, { snapshot: instance.snapshot as unknown as Snapshot<unknown> });
    return actor.getSnapshot() as AnyMachineSnapshot;
  }

  private async afterTransition(t: {
    instance: WorkflowInstance;
    cmd: SendWorkflowEvent;
    from: string;
    stateChanged: boolean;
    snapshot: AnyMachineSnapshot;
    tx: TransactionContext;
  }): Promise<void> {
    const { instance, cmd, from, stateChanged, snapshot, tx } = t;
    const payload: WorkflowTransitionedPayload = {
      instanceId: instance.id,
      definitionKey: instance.definitionKey,
      entityType: instance.entityType,
      entityId: instance.entityId,
      event: cmd.event.type,
      from,
      to: instance.state,
      isDone: instance.isDone,
      actorId: cmd.actorId,
    };
    await this.outbox.enqueue(WORKFLOW_TRANSITIONED, payload, tx);
    if (stateChanged) await this.scheduleTimeout(instance, snapshot, tx);
  }

  private async scheduleTimeout(instance: WorkflowInstance, snapshot: AnyMachineSnapshot, tx: TransactionContext): Promise<void> {
    const dedupeKey = `workflow:${instance.id}:timeout`;
    const timeout = Object.values(snapshot.getMeta() as Record<string, StateTimeoutMeta>).find((m) => m?.timeout)?.timeout;
    if (!timeout || instance.isDone) {
      await this.scheduler.cancel(dedupeKey, tx);
      return;
    }
    const runAt = new Date(this.clock.now().getTime() + timeout.afterMs);
    const payload = { instanceId: instance.id, state: instance.state, event: timeout.event };
    await this.scheduler.schedule(WORKFLOW_TIMEOUT, payload, { runAt, dedupeKey, tx });
  }

  /** Fires the timeout event only if the instance is still in the state that scheduled it. */
  private async onTimeout(payload: { instanceId: string; state: string; event: string }): Promise<void> {
    const instance = await this.repo.findById(payload.instanceId);
    if (!instance || instance.isDone || instance.state !== payload.state) return;
    await this.send({ instanceId: instance.id, event: { type: payload.event }, actorId: null, comment: 'timeout' });
  }

  private within<T>(tx: TransactionContext | undefined, work: (tx: TransactionContext) => Promise<T>): Promise<T> {
    return tx ? work(tx) : this.tx.run(work);
  }
}

function stateName(snapshot: AnyMachineSnapshot): string {
  return typeof snapshot.value === 'string' ? snapshot.value : JSON.stringify(snapshot.value);
}
