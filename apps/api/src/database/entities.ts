import { Role, RolePermission } from '../core/access/domain/role.entity';
import { ListSetting } from '../core/lists/domain/list-setting.entity';
import { RoleGroup } from '../core/access/domain/role-group.entity';
import { RoleGroupPermission } from '../core/access/domain/role-group-permission.entity';
import { RoleGroupRole } from '../core/access/domain/role-group-role.entity';
import { UserGroup } from '../core/access/domain/user-group.entity';
import { UserGroupMember } from '../core/access/domain/user-group-member.entity';
import { UserGroupPermission } from '../core/access/domain/user-group-permission.entity';
import { UserPermission } from '../core/access/domain/user-permission.entity';
import { UserRoleGroup } from '../core/access/domain/user-role-group.entity';
import { PageVisibilityRule } from '../core/access/domain/page-visibility-rule.entity';
import { UserRole } from '../core/access/domain/user-role.entity';
import { AuditLog } from '../core/audit/domain/audit-log.entity';
import { Authenticator, AuthenticatorBackupCode, EnrollmentInvite } from '../core/auth/domain/authenticator.entities';
import { AllowedEmailDomain } from '../core/auth/domain/allowed-email-domain.entity';
import { SecuritySetting } from '../core/auth/domain/security-setting.entity';
import { TrustedDevice } from '../core/auth/domain/trusted-device.entity';
import { User } from '../core/auth/domain/user.entity';
import { StoredFile } from '../core/files/domain/stored-file.entity';
import { OutboxMessage } from '../core/messaging/domain/outbox-message.entity';
import { ProcessedMessage } from '../core/messaging/domain/processed-message.entity';
import { ScheduledJob } from '../core/messaging/domain/scheduled-job.entity';
import { IntegrationProvider } from '../core/integrations/domain/entities/integration-provider.entity';
import { MessageTemplate } from '../core/templates/domain/entities/message-template.entity';
import { TemplateSetting } from '../core/templates/domain/entities/template-setting.entity';
import { EmailLog } from '../core/notifications/domain/email-log.entity';
import { Notification } from '../core/notifications/domain/notification.entity';
import { WorkflowInstance, WorkflowTransition } from '../core/workflow/domain/workflow-instance.entity';
import { Employee } from '../modules/employees/domain/entities/employee.entity';
import { EmployeeAssignment } from '../modules/employees/domain/entities/employee-assignment.entity';
import { LOOKUP_ENTITIES } from '../modules/lookups/domain/entities/lookup.entities';
import { ORG_ENTITIES } from '../modules/org/domain/entities/org.entities';
import { TASK_ENTITIES } from '../modules/tasks/domain/entities/task.entities';
import { TASK_COMMENT_ENTITIES } from '../modules/tasks/domain/entities/task-comment.entities';
import { TOUR_ENTITIES } from '../modules/tour/domain/entities/tour.entities';
import { TICKET_ENTITIES } from '../modules/tickets/domain/entities/ticket.entities';

/**
 * Every TypeORM entity, listed explicitly (no file globs) so the app, the CLI and
 * the test runner load exactly the same classes. Add new module entities here.
 */
export const ENTITIES = [
  User,
  TrustedDevice,
  AllowedEmailDomain,
  SecuritySetting,
  Authenticator,
  AuthenticatorBackupCode,
  EnrollmentInvite,
  Role,
  RolePermission,
  UserRole,
  PageVisibilityRule,
  RoleGroup,
  RoleGroupRole,
  RoleGroupPermission,
  UserGroup,
  UserGroupMember,
  UserGroupPermission,
  UserRoleGroup,
  UserPermission,
  ListSetting,
  AuditLog,
  StoredFile,
  OutboxMessage,
  ProcessedMessage,
  ScheduledJob,
  Notification,
  EmailLog,
  IntegrationProvider,
  MessageTemplate,
  TemplateSetting,
  WorkflowInstance,
  WorkflowTransition,
  ...LOOKUP_ENTITIES,
  ...ORG_ENTITIES,
  ...TICKET_ENTITIES,
  ...TASK_ENTITIES,
  ...TASK_COMMENT_ENTITIES,
  ...TOUR_ENTITIES,
  Employee,
  EmployeeAssignment,
];
