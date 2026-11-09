import { Injectable } from '@nestjs/common';
import { Clock } from '../../../../common/application/clock';
import { NotificationsService } from '../../../../core/notifications/application/notifications.service';
import { CareerContentRepository } from '../../domain/contracts/career-content.repository';
import { CareerLearningRepository } from '../../domain/contracts/career-learning.repository';
import { EmployeeCareerPort, type CareerHolder } from '../../domain/contracts/employee-career.port';
import { teamNumbers } from '../../domain/rules/team.rules';

/** Where a reminder opens: the same page as the proof notices, with a query of its own so one unread notice never silences the other. */
const REMINDER_LINK = '/career-profile?reminder=late';

/** The late people found by one pass: who they are and who they report to. */
interface Late {
  holder: CareerHolder;
  overdue: number;
}

/** Reminders to the employees with late items in their path, and the monthly report to each manager (FR-115). Run by the schedule; the tests call it themselves. */
@Injectable()
export class CareerReminderService {
  constructor(
    private readonly employees: EmployeeCareerPort,
    private readonly content: CareerContentRepository,
    private readonly records: CareerLearningRepository,
    private readonly notifications: NotificationsService,
    private readonly clock: Clock,
  ) {}

  /** Tells each employee who has late dated items (past their date and not ticked) once; returns how many were told. */
  async remindEmployees(today: string): Promise<number> {
    const late = await this.findLate(today);
    for (const { holder, overdue } of late) {
      await this.notifications.notify({
        userIds: [holder.userId], link: REMINDER_LINK, coalesce: true,
        titleAr: 'عندك بنود متأخرة في مسارك الوظيفي', titleEn: 'You have late items in your career path',
        bodyAr: `${overdue} من المطلوب تجاوز موعده.`, bodyEn: `${overdue} required item(s) are past their date.`,
      });
    }
    return late.length;
  }

  /** Tells each manager how many of their direct reports are late; returns how many managers were told. */
  async reportToManagers(today: string): Promise<number> {
    const perManager = new Map<string, number>();
    for (const { holder } of await this.findLate(today)) if (holder.managerUserId) perManager.set(holder.managerUserId, (perManager.get(holder.managerUserId) ?? 0) + 1);
    for (const [manager, count] of perManager) {
      await this.notifications.notify({
        userIds: [manager], link: '/career-team',
        titleAr: 'تقرير المسار المهني الشهري', titleEn: 'Monthly career-path report',
        bodyAr: `${count} من فريقك المباشر متأخر في المطلوب.`, bodyEn: `${count} of your direct team are late in what is required.`,
      });
    }
    return perManager.size;
  }

  private async findLate(today: string): Promise<Late[]> {
    const holders = await this.employees.holders();
    const ids = holders.map((h) => h.employeeId);
    const [records, ticks] = await Promise.all([this.records.forEmployees(ids), this.records.requiredDoneFor(ids)]);
    const out: Late[] = [];
    for (const holder of holders) {
      const stored = await this.content.find(holder.titleId);
      if (stored?.status !== 'ready') continue;
      const mine = ticks.filter((t) => t.employeeId === holder.employeeId && t.titleId === holder.titleId).map((t) => t.index);
      const { overdue } = teamNumbers({ content: stored.content, records: records.filter((r) => r.employeeId === holder.employeeId), ticked: mine, today });
      if (overdue > 0) out.push({ holder, overdue });
    }
    return out;
  }
}
