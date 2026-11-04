import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EmployeeAssignmentsService } from '../../application/services/employee-assignments.service';

/** Starts the placement changes whose day has come (a few minutes after midnight in Riyadh). */
@Injectable()
export class EmployeeAssignmentsJob {
  constructor(private readonly assignments: EmployeeAssignmentsService) {}

  @Cron('10 0 * * *', { timeZone: 'Asia/Riyadh' })
  async scheduled(): Promise<void> {
    await this.assignments.applyDue();
  }
}
