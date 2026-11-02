export abstract class SecuritySettingsRepository {
  /** The numbers an administrator has set, by key; a key left out has its default. */
  abstract all(): Promise<Map<string, number>>;
  abstract set(values: Record<string, number>, updatedBy: string | null): Promise<void>;
}
