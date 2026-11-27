import { Injectable } from '@nestjs/common';
import { riyadhHour, riyadhToday } from '@arweqah-platform/shared';
import { Clock } from '../../../../common/application/clock';
import { TransactionRunner } from '../../../../common/application/transaction-runner';
import { TaskNoticePreferenceRepository } from '../../domain/contracts/task-notice-preference.repository';
import { TaskNotifier } from './task-notifier.service';

/** The daily summary of a person's own tasks (open, due today, overdue), sent at the hour they chose (FR-215). */
@Injectable()
export class TaskDigestService {
  constructor(
    private readonly preferences: TaskNoticePreferenceRepository,
    private readonly notifier: TaskNotifier,
    private readonly tx: TransactionRunner,
    private readonly clock: Clock,
  ) {}

  /**
   * Sends the summary to everyone whose hour has come and who was not handled today; a person with no open task gets nothing but is
   * marked handled too, so the sweep does not count them again all day. Each person is its own transaction. Returns how many were sent.
   */
  async sendDue(now: Date = this.clock.now()): Promise<number> {
    const today = riyadhToday(now);
    const people = await this.preferences.digestRecipients(riyadhHour(now), today);
    let sent = 0;
    for (const person of people) {
      await this.tx.run(async (tx) => {
        if (person.open > 0) {
          await this.notifier.send({ kind: 'summary', task: { id: '', number: 0, title: '' }, recipients: [person.userId], figures: person, link: '/tasks', tx });
          sent += 1;
        }
        await this.preferences.markDigestHandled(person.userId, today, tx);
      });
    }
    return sent;
  }
}
