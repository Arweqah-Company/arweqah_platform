import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CorePermission, EMPLOYEE_PHOTO_MAX_BYTES, EMPLOYEE_PHOTO_TYPES, type EmployeeDto } from '@arweqah-platform/shared';
import { TransactionRunner } from '../../../../common/application/transaction-runner';
import { NotFoundError } from '../../../../common/domain/domain-error';
import { AbilityFactory } from '../../../../core/access/application/ability.factory';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { FilesService, type IncomingFile } from '../../../../core/files/application/files.service';
import type { StoredFile } from '../../../../core/files/domain/stored-file.entity';
import { EmployeeRepository } from '../../domain/contracts/employee.repository';
import type { Employee } from '../../domain/entities/employee.entity';
import { EMPLOYEE_AUDIT } from '../messages/employee.messages';
import { EmployeeReachPolicy } from '../policies/employee-reach.policy';
import { EmployeeAuditService } from './employee-audit.service';

/** The profile photo of an employee (FR-91): a small JPEG or PNG, changed by the person or by HR within their reach, shown to the person's teammates and to whoever reaches the record. */
@Injectable()
export class EmployeePhotoService {
  constructor(
    private readonly employees: EmployeeRepository,
    private readonly files: FilesService,
    private readonly ability: AbilityFactory,
    private readonly tx: TransactionRunner,
    private readonly events: EventEmitter2,
    private readonly reach: EmployeeReachPolicy,
    private readonly auditor: EmployeeAuditService,
  ) {}

  async set(ctx: AccessContext, employeeId: string, file: IncomingFile, actorId: string): Promise<Pick<EmployeeDto, 'photoFileId'>> {
    const employee = await this.reach.find(ctx, employeeId, CorePermission.EmployeesPhotoUpdate);
    const stored = await this.files.upload(actorId, file, { maxBytes: EMPLOYEE_PHOTO_MAX_BYTES, types: EMPLOYEE_PHOTO_TYPES });
    await this.tx.run((tx) => this.employees.update(employee.id, { photoFileId: stored.id }, tx));
    this.auditor.record(actorId, EMPLOYEE_AUDIT.photoChanged, employee.id);
    return { photoFileId: stored.id };
  }

  async clear(ctx: AccessContext, employeeId: string, actorId: string): Promise<void> {
    const employee = await this.reach.find(ctx, employeeId, CorePermission.EmployeesPhotoUpdate);
    if (!employee.photoFileId) return;
    await this.tx.run((tx) => this.employees.update(employee.id, { photoFileId: null }, tx));
    this.auditor.record(actorId, EMPLOYEE_AUDIT.photoRemoved, employee.id);
  }

  /** The photo file of an employee the caller may see: whom they reach by `employees.view`, themselves and their teammates; none stored is a 404 (the screen shows the initial). */
  async fileOf(ctx: AccessContext, employeeId: string): Promise<StoredFile> {
    const employee = await this.employees.findById(employeeId);
    if (!employee || !(await this.mayRead(ctx, employee))) throw new NotFoundError('Employee', employeeId);
    if (!employee.photoFileId) throw new NotFoundError('Photo', employeeId);
    return this.files.getGranted(employee.photoFileId);
  }

  /** Whoever reaches the record with `employees.view`, or (with `directory.view`) the person's teammates. */
  private async mayRead(ctx: AccessContext, employee: Employee): Promise<boolean> {
    return this.reach.can(ctx, CorePermission.EmployeesView, employee) || (ctx.has(CorePermission.DirectoryView) && (await this.reach.isOfMyTeam(ctx, employee)));
  }

  open(file: StoredFile) {
    return this.files.open(file);
  }
}
