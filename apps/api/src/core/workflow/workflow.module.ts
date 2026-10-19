import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowRegistry } from './application/workflow-definition';
import { WorkflowEngine } from './application/workflow-engine';
import { WorkflowInstance, WorkflowTransition } from './domain/workflow-instance.entity';
import { WorkflowRepository } from './domain/workflow.repository';
import { TypeOrmWorkflowRepository } from './infrastructure/typeorm-workflow.repository';

/** Feature modules inject WorkflowRegistry (to register machines) and WorkflowEngine. */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([WorkflowInstance, WorkflowTransition])],
  providers: [WorkflowRegistry, WorkflowEngine, { provide: WorkflowRepository, useClass: TypeOrmWorkflowRepository }],
  exports: [WorkflowRegistry, WorkflowEngine],
})
export class WorkflowModule {}
