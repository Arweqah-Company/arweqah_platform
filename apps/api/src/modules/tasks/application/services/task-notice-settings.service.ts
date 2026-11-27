import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { riyadhHour, riyadhToday, TASK_NOTICE_DEFAULTS, type TaskNoticeChannel, type TaskNoticeSettings } from '@arweqah-platform/shared';
import { Clock } from '../../../../common/application/clock';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import { TaskNoticePreferenceRepository } from '../../domain/contracts/task-notice-preference.repository';
import { TASK_AUDIT } from '../messages/task.messages';

/** Who gets each notice of the summary and the reminders, grouped by the channel they chose. */
export type NoticeGroups = Record<TaskNoticeChannel, string[]>;

/** What a person chose for the task summary and reminders (FR-215…FR-218): the channel, the summary hour and whether to be reminded. */
@Injectable()
export class TaskNoticeSettingsService {
  constructor(
    private readonly preferences: TaskNoticePreferenceRepository,
    private readonly events: EventEmitter2,
    private readonly clock: Clock,
  ) {}

  async get(userId: string): Promise<TaskNoticeSettings> {
    return (await this.preferences.find(userId)) ?? TASK_NOTICE_DEFAULTS;
  }

  /**
   * Saves the settings. A summary time (or switch) changed to an hour that has already passed today waits for tomorrow,
   * so saving at 14:00 never sends a summary at once.
   */
  async update(userId: string, input: TaskNoticeSettings): Promise<TaskNoticeSettings> {
    const current = await this.get(userId);
    const now = this.clock.now();
    const changedTime = current.digestHour !== input.digestHour || current.digestEnabled !== input.digestEnabled;
    await this.preferences.save(userId, input, changedTime && input.digestHour <= riyadhHour(now) ? riyadhToday(now) : null);
    const event: AuditEvent = { actorId: userId, action: TASK_AUDIT.noticeSettingsUpdated, entityType: 'task_notice_settings', entityId: userId, changes: { ...input } };
    this.events.emit(AUDIT_EVENT, event);
    return input;
  }

  /** The people grouped by channel; with `onlyReminded`, those who switched the reminders off are left out. */
  async groupByChannel(userIds: string[], onlyReminded: boolean): Promise<NoticeGroups> {
    const saved = await this.preferences.findMany(userIds);
    const groups: NoticeGroups = { in_app: [], email: [], both: [] };
    for (const id of userIds) {
      const settings = saved.get(id) ?? TASK_NOTICE_DEFAULTS;
      if (!onlyReminded || settings.remindersEnabled) groups[settings.channel].push(id);
    }
    return groups;
  }
}
