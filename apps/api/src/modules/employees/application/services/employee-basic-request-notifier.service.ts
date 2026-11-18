import { Injectable } from '@nestjs/common';
import { CorePermission, type BasicRequestInput } from '@arweqah-platform/shared';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import { AbilityFactory } from '../../../../core/access/application/ability.factory';
import { AccessContextService } from '../../../../core/access/application/access-context.service';
import { PermissionHoldersService } from '../../../../core/access/application/permission-holders.service';
import { NotificationsService } from '../../../../core/notifications/application/notifications.service';
import type { Employee } from '../../domain/entities/employee.entity';

/** The notices of a request to change basic data: to the people who may approve it when it is sent, to the employee when it is decided. */
@Injectable()
export class EmployeeBasicRequestNotifier {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly holders: PermissionHoldersService,
    private readonly contexts: AccessContextService,
    private readonly ability: AbilityFactory,
  ) {}

  /** Those who hold «edit employees» beyond their own record, reach this employee, and may change every field asked for. */
  async approversOf(employee: Employee, changes: BasicRequestInput): Promise<string[]> {
    const resource = { ownerId: employee.userId, companyId: employee.companyId, orgNodeId: employee.orgNodeId };
    const fields = Object.keys(changes);
    const candidates = (await this.holders.holdersOf(CorePermission.EmployeesUpdate, { beyondOwn: true })).filter((id) => id !== employee.userId);
    const reached = await Promise.all(candidates.map(async (id) => {
      const ctx = await this.contexts.forUser(id);
      const allowed = ctx && this.ability.can(ctx, CorePermission.EmployeesUpdate, resource) ? new Set(this.ability.fieldsFor(ctx, CorePermission.EmployeesUpdate, resource)) : null;
      return allowed && fields.every((f) => allowed.has(f)) ? id : null;
    }));
    return reached.filter((id): id is string => id !== null);
  }

  async sent(employee: Employee, approvers: string[], tx: TransactionContext): Promise<void> {
    if (!approvers.length) return;
    await this.notifications.notify({
      userIds: approvers, tx, coalesce: true, link: `/employees/${employee.id}`,
      titleAr: 'طلب تعديل بيانات أساسية', titleEn: 'A request to change basic data',
      bodyAr: `${employee.fullName} طلب تعديل بياناته الأساسية وينتظر قرارك.`, bodyEn: `${employee.fullNameEn ?? employee.fullName} asked to change their basic data and waits for your decision.`,
    });
  }

  async decided(employee: Employee, approved: boolean, reason: string | null, tx: TransactionContext): Promise<void> {
    await this.notifications.notify({
      userIds: [employee.userId], tx, link: '/profile',
      titleAr: approved ? 'اعتُمد طلب تعديل بياناتك' : 'رُفض طلب تعديل بياناتك', titleEn: approved ? 'Your data change was approved' : 'Your data change was rejected',
      bodyAr: approved ? 'حُدّثت بياناتك الأساسية.' : `لم تتغير بياناتك الأساسية.${reason ? ` السبب: ${reason}` : ''}`,
      bodyEn: approved ? 'Your basic data was updated.' : `Your basic data did not change.${reason ? ` Reason: ${reason}` : ''}`,
    });
  }
}
