import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { ACCESS_CHANGED, EMPLOYEES_CHANGED, ORG_CHANGED } from '../../../../core/access/application/access.events';
import { OrgChainService } from '../../../org/application/services/org-chain.service';
import { EmployeeAssignmentsService } from './employee-assignments.service';

/**
 * Keeps the direct manager of employees in step with the reporting line of job titles (FR-100, plan 11.4): the nearest title above the employee's that somebody
 * holds, never leaving the employee's company inside a unit managed per company. It runs when an employee is placed or changes unit or title, when the structure
 * changes, and every night. A manager HR chose stays (`manual`); one the system set follows people as they come and go; a title with no reporting line is left alone.
 */
@Injectable()
export class EmployeeAutoManagerService {
  private readonly logger = new Logger(EmployeeAutoManagerService.name);
  private running = false;
  private again = false;

  constructor(
    private readonly chain: OrgChainService,
    private readonly assignments: EmployeeAssignmentsService,
    private readonly events: EventEmitter2,
  ) {}

  @OnEvent(ORG_CHANGED)
  @OnEvent(EMPLOYEES_CHANGED)
  async onChange(): Promise<void> {
    try {
      await this.refresh();
    } catch (error) {
      // The change that announced itself already happened; the nightly pass tries again.
      this.logger.error(`The automatic managers could not be refreshed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /** Recomputes every employee's manager from the reporting line; returns how many changed. A pass asked for while one runs is folded into it. */
  async refresh(): Promise<number> {
    if (this.running) {
      this.again = true;
      return 0;
    }
    this.running = true;
    let changed = 0;
    try {
      do {
        this.again = false;
        changed += await this.pass();
      } while (this.again);
    } finally {
      this.running = false;
    }
    if (changed) {
      this.events.emit(ACCESS_CHANGED, {});
      await this.events.emitAsync(EMPLOYEES_CHANGED);
    }
    return changed;
  }

  private async pass(): Promise<number> {
    let changed = 0;
    for (const [employeeId, { managerId, currentManagerId }] of await this.chain.managersForPlaced()) {
      if (managerId === currentManagerId) continue;
      try {
        if (await this.assignments.followChain(employeeId, managerId)) changed += 1;
      } catch (error) {
        this.logger.error(`The manager of employee ${employeeId} could not follow the reporting line: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    return changed;
  }
}
