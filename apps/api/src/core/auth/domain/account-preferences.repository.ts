import type { Theme } from '@arweqah-platform/shared';

export interface AccountPreferences {
  locale: 'ar' | 'en';
  theme: Theme;
}

export abstract class AccountPreferencesRepository {
  abstract find(userId: string): Promise<AccountPreferences | null>;
  abstract update(userId: string, patch: Partial<AccountPreferences>): Promise<void>;
}
