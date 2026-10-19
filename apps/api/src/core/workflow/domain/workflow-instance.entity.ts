import { Column, Entity, Index, ManyToOne, JoinColumn, CreateDateColumn, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../../common/domain/base.entity';

/** A running (or finished) state machine attached to one business record. */
@Entity('workflow_instances')
@Index(['entityType', 'entityId'])
export class WorkflowInstance extends BaseEntity {
  @Column({ name: 'definition_key', type: 'varchar', length: 100 })
  definitionKey: string;

  @Column({ name: 'definition_version', type: 'int' })
  definitionVersion: number;

  @Column({ name: 'entity_type', type: 'varchar', length: 80 })
  entityType: string;

  @Column({ name: 'entity_id', type: 'uuid' })
  entityId: string;

  /** Current state value, e.g. "pendingManager" (JSON text for nested states). */
  @Index()
  @Column({ type: 'varchar', length: 200 })
  state: string;

  @Column({ name: 'is_done', type: 'boolean', default: false })
  isDone: boolean;

  /** XState persisted snapshot, restored for every transition. */
  @Column({ type: 'jsonb' })
  snapshot: Record<string, unknown>;

  @Column({ name: 'started_by', type: 'uuid', nullable: true })
  startedBy: string | null;

  /** Optimistic lock: two concurrent approvals cannot both succeed. */
  @Column({ type: 'int', default: 1 })
  revision: number;
}

@Entity('workflow_transitions')
export class WorkflowTransition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'instance_id', type: 'uuid' })
  instanceId: string;

  @ManyToOne(() => WorkflowInstance, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'instance_id' })
  instance?: WorkflowInstance;

  @Column({ type: 'varchar', length: 80 })
  event: string;

  @Column({ name: 'from_state', type: 'varchar', length: 200 })
  fromState: string;

  @Column({ name: 'to_state', type: 'varchar', length: 200 })
  toState: string;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId: string | null;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  comment: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
