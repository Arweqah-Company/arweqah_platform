import { Role, RolePermission } from '../core/access/domain/role.entity';
import { UserPlacement } from '../core/access/domain/user-placement.entity';
import { UserRole } from '../core/access/domain/user-role.entity';
import { AuditLog } from '../core/audit/domain/audit-log.entity';
import { StoredFile } from '../core/files/domain/stored-file.entity';
import { OutboxMessage } from '../core/messaging/domain/outbox-message.entity';
import { ProcessedMessage } from '../core/messaging/domain/processed-message.entity';
import { ScheduledJob } from '../core/messaging/domain/scheduled-job.entity';
import { Notification } from '../core/notifications/domain/notification.entity';
import { WorkflowInstance, WorkflowTransition } from '../core/workflow/domain/workflow-instance.entity';
import { Branch, Department, Team } from '../modules/org/domain/org.entities';
import { User } from '../modules/users/domain/user.entity';

/**
 * Every TypeORM entity, listed explicitly (no file globs) so the app, the CLI and
 * the test runner load exactly the same classes. Add new module entities here.
 */
export const ENTITIES = [
  User,
  Role,
  RolePermission,
  UserRole,
  UserPlacement,
  AuditLog,
  StoredFile,
  OutboxMessage,
  ProcessedMessage,
  ScheduledJob,
  Notification,
  WorkflowInstance,
  WorkflowTransition,
  Branch,
  Department,
  Team,
];
