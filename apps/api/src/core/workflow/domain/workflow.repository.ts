import type { TransactionContext } from '../../../common/domain/transaction-context';
import type { WorkflowInstance, WorkflowTransition } from './workflow-instance.entity';

export abstract class WorkflowRepository {
  abstract findById(id: string, tx?: TransactionContext): Promise<WorkflowInstance | null>;
  abstract findByEntity(entityType: string, entityId: string): Promise<WorkflowInstance | null>;
  abstract insert(instance: WorkflowInstance, tx?: TransactionContext): Promise<WorkflowInstance>;
  /** Saves only if the stored revision still equals `expectedRevision`. */
  abstract updateIfRevision(instance: WorkflowInstance, expectedRevision: number, tx?: TransactionContext): Promise<boolean>;
  abstract addTransition(transition: Omit<WorkflowTransition, 'id' | 'createdAt'>, tx?: TransactionContext): Promise<void>;
  abstract history(instanceId: string): Promise<WorkflowTransition[]>;
}
