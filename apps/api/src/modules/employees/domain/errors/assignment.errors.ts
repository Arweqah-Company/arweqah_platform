import { BusinessRuleError } from '../../../../common/domain/domain-error';

/** The new period must start after the one in force (or the last one waiting), or nothing is left of it. */
export class AssignmentDateNotAfterError extends BusinessRuleError {
  override readonly code = 'ASSIGNMENT_DATE_NOT_AFTER';
  constructor(lastFrom: string) {
    super(`The change must start after ${lastFrom}`, { path: 'validFrom', messageAr: `يجب أن يبدأ التغيير بعد ${lastFrom}`, messageEn: `The change must start after ${lastFrom}` });
  }
}

/** Placement is changed from today onward; the past is corrected only through the history it already holds. */
export class AssignmentInThePastError extends BusinessRuleError {
  override readonly code = 'ASSIGNMENT_IN_THE_PAST';
  constructor() {
    super('The change cannot start in the past', { path: 'validFrom', messageAr: 'لا يبدأ التغيير في الماضي', messageEn: 'The change cannot start in the past' });
  }
}

export class AssignmentNoChangeError extends BusinessRuleError {
  override readonly code = 'ASSIGNMENT_NO_CHANGE';
  constructor() {
    super('The chosen values are already in force', { messageAr: 'القيم المختارة سارية بالفعل', messageEn: 'The chosen values are already in force' });
  }
}

/** Only a change that has not started yet can be cancelled. */
export class AssignmentNotPendingError extends BusinessRuleError {
  override readonly code = 'ASSIGNMENT_NOT_PENDING';
  constructor() {
    super('Only a change that has not started yet can be cancelled', { messageAr: 'لا يُلغى إلا تغيير لم يبدأ بعد', messageEn: 'Only a change that has not started yet can be cancelled' });
  }
}
