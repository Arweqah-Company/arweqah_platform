import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../common/domain/domain-error';
import { AccountPreferencesRepository, type AccountPreferences } from '../domain/account-preferences.repository';

/** The interface language and theme a person chose; they follow the account to every device. */
@Injectable()
export class AccountPreferencesService {
  constructor(private readonly repo: AccountPreferencesRepository) {}

  async get(userId: string): Promise<AccountPreferences> {
    const found = await this.repo.find(userId);
    if (!found) throw new NotFoundError('User', userId);
    return found;
  }

  /** Saves only what was sent; returns the names of the preferences that changed. */
  async update(userId: string, patch: Partial<AccountPreferences>): Promise<string[]> {
    const current = await this.get(userId);
    const changed = (Object.keys(patch) as (keyof AccountPreferences)[]).filter((key) => patch[key] !== undefined && patch[key] !== current[key]);
    if (changed.length) await this.repo.update(userId, Object.fromEntries(changed.map((key) => [key, patch[key]])));
    return changed;
  }
}
