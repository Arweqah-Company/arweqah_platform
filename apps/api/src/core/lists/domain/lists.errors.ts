import { BusinessRuleError } from '../../../common/domain/domain-error';

/** The list does not exist, or a column or filter is not one of its own, or the name column was hidden. */
export class InvalidListSettingError extends BusinessRuleError {
  override readonly code = 'LIST_SETTING_INVALID';
  constructor(reason: string) {
    super(reason);
  }
}
