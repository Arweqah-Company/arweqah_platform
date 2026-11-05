import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EmployeeAssignmentsService } from '../../application/services/employee-assignments.service';
import { EmployeeAutoManagerService } from '../../application/services/employee-auto-manager.service';

/** Starts the placement changes whose day has come (a few minutes after midnight in Riyadh), then lets the managers follow the reporting line of job titles. */
@Injectable()
export class EmployeeAssignmentsJob {
  constructor(
    private readonly assignments: EmployeeAssignmentsService,
    private readonly autoManager: EmployeeAutoManagerService,
  ) {}

  @Cron('10 0 * * *', { timeZone: 'Asia/Riyadh' })
  async scheduled(): Promise<void> {
    await this.assignments.applyDue();
    await this.autoManager.refresh();
  }
}
