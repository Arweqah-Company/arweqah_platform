import type { ListSetting } from './list-setting.entity';

export abstract class ListSettingsRepository {
  abstract findAll(): Promise<ListSetting[]>;
  /** Stores what is hidden in one list; a list with nothing hidden has no row. */
  abstract replace(listKey: string, hiddenColumns: string[], hiddenFilters: string[]): Promise<void>;
}
