import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LIST_KEYS, type ListKey, type ListSettingDto, type ListSettingsDto, type ListSettingsInput } from '@arweqah-platform/shared';
import { AUDIT_EVENT, type AuditEvent } from '../../audit/application/audit.events';
import { assertHideable } from '../domain/list-settings.rules';
import { ListSettingsRepository } from '../domain/list-settings.repository';

/** What is hidden in each list (columns and filters): one setting for everyone, chosen by an administrator. */
@Injectable()
export class ListSettingsService {
  constructor(
    private readonly repo: ListSettingsRepository,
    private readonly events: EventEmitter2,
  ) {}

  async all(): Promise<ListSettingsDto> {
    const known = new Set<string>(LIST_KEYS);
    const result: ListSettingsDto = {};
    for (const row of await this.repo.findAll()) if (known.has(row.listKey)) result[row.listKey as ListKey] = { hiddenColumns: row.hiddenColumns, hiddenFilters: row.hiddenFilters };
    return result;
  }

  async replace(listKey: string, input: ListSettingsInput, actorId: string): Promise<ListSettingDto> {
    const hiddenColumns = [...new Set(input.hiddenColumns)];
    const hiddenFilters = [...new Set(input.hiddenFilters)];
    assertHideable(listKey, hiddenColumns, hiddenFilters);
    await this.repo.replace(listKey, hiddenColumns, hiddenFilters);
    const event: AuditEvent = { actorId, action: 'list.settings_updated', entityType: 'list', entityId: listKey, changes: { hiddenColumns, hiddenFilters } };
    this.events.emit(AUDIT_EVENT, event);
    return { hiddenColumns, hiddenFilters };
  }
}
