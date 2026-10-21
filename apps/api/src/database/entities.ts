import { Role, RolePermission } from '../core/access/domain/role.entity';
import { UserRole } from '../core/access/domain/user-role.entity';
import { AuditLog } from '../core/audit/domain/audit-log.entity';
import { Authenticator, AuthenticatorBackupCode, EnrollmentInvite } from '../core/auth/domain/authenticator.entities';
import { User } from '../core/auth/domain/user.entity';
import { StoredFile } from '../core/files/domain/stored-file.entity';
import { OutboxMessage } from '../core/messaging/domain/outbox-message.entity';
import { ProcessedMessage } from '../core/messaging/domain/processed-message.entity';
import { ScheduledJob } from '../core/messaging/domain/scheduled-job.entity';
import { EmailLog } from '../core/notifications/domain/email-log.entity';
import { Notification } from '../core/notifications/domain/notification.entity';
import { WorkflowInstance, WorkflowTransition } from '../core/workflow/domain/workflow-instance.entity';
import { Employee } from '../modules/employees/domain/entities/employee.entity';
import { LOOKUP_ENTITIES } from '../modules/lookups/domain/entities/lookup.entities';
import { ORG_ENTITIES } from '../modules/org/domain/entities/org.entities';

/**
 * Every TypeORM entity, listed explicitly (no file globs) so the app, the CLI and
 * the test runner load exactly the same classes. Add new module entities here.
 */
export const ENTITIES = [
  User,
  Authenticator,
  AuthenticatorBackupCode,
  EnrollmentInvite,
  Role,
  RolePermission,
  UserRole,
  AuditLog,
  StoredFile,
  OutboxMessage,
  ProcessedMessage,
  ScheduledJob,
  Notification,
  EmailLog,
  WorkflowInstance,
  WorkflowTransition,
  ...LOOKUP_ENTITIES,
  ...ORG_ENTITIES,
  Employee,
];
