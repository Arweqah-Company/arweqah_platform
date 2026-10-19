import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { TransactionContext } from '../../../common/application/transaction-runner';
import { managerOf } from '../../../common/infrastructure/typeorm-transaction-runner';
import { WorkflowInstance, WorkflowTransition } from '../domain/workflow-instance.entity';
import { WorkflowRepository } from '../domain/workflow.repository';

@Injectable()
export class TypeOrmWorkflowRepository extends WorkflowRepository {
  constructor(
    @InjectRepository(WorkflowInstance) private readonly instances: Repository<WorkflowInstance>,
    @InjectRepository(WorkflowTransition) private readonly transitions: Repository<WorkflowTransition>,
  ) {
    super();
  }

  findById(id: string, tx?: TransactionContext): Promise<WorkflowInstance | null> {
    return managerOf(tx, this.instances.manager).findOne(WorkflowInstance, { where: { id } });
  }

  findByEntity(entityType: string, entityId: string): Promise<WorkflowInstance | null> {
    return this.instances.findOne({ where: { entityType, entityId }, order: { createdAt: 'DESC' } });
  }

  insert(instance: WorkflowInstance, tx?: TransactionContext): Promise<WorkflowInstance> {
    return managerOf(tx, this.instances.manager).save(WorkflowInstance, instance);
  }

  async updateIfRevision(instance: WorkflowInstance, expectedRevision: number, tx?: TransactionContext): Promise<boolean> {
    const result = await managerOf(tx, this.instances.manager)
      .createQueryBuilder()
      .update(WorkflowInstance)
      .set({
        state: instance.state,
        isDone: instance.isDone,
        snapshot: instance.snapshot as never,
        revision: instance.revision,
      })
      .where('id = :id AND revision = :expectedRevision', { id: instance.id, expectedRevision })
      .execute();
    return (result.affected ?? 0) === 1;
  }

  async addTransition(transition: Omit<WorkflowTransition, 'id' | 'createdAt'>, tx?: TransactionContext): Promise<void> {
    await managerOf(tx, this.transitions.manager).insert(WorkflowTransition, transition as never);
  }

  history(instanceId: string): Promise<WorkflowTransition[]> {
    return this.transitions.find({ where: { instanceId }, order: { createdAt: 'ASC' } });
  }
}
