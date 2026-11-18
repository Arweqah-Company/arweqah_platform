import { BusinessRuleError, ConflictError } from '../../../../common/domain/domain-error';

export class BasicRequestNoChangeError extends BusinessRuleError {
  override readonly code = 'BASIC_REQUEST_NO_CHANGE';
  constructor() {
    super('The values asked for are already in the record', { messageAr: 'القيم المطلوبة هي نفسها المحفوظة في سجلك', messageEn: 'The values asked for are already in your record' });
  }
}

export class BasicRequestPendingError extends ConflictError {
  override readonly code = 'BASIC_REQUEST_PENDING';
  constructor() {
    super('A request is already waiting for HR', { messageAr: 'لديك طلب تعديل ينتظر الموارد البشرية. ألغِه أولًا أو انتظر قرارها.', messageEn: 'You already have a request waiting for HR. Cancel it first or wait for the decision.' });
  }
}

/** There is nothing waiting: it was decided or cancelled meanwhile. */
export class BasicRequestNotPendingError extends ConflictError {
  override readonly code = 'BASIC_REQUEST_NOT_PENDING';
  constructor() {
    super('The request is no longer waiting', { messageAr: 'لم يعد الطلب معلّقًا (تم البتّ فيه أو أُلغي)', messageEn: 'The request is no longer waiting (it was decided or cancelled)' });
  }
}

/** The person asking has no employee record, or decides their own request. */
export class BasicRequestNotAllowedError extends BusinessRuleError {
  override readonly code = 'BASIC_REQUEST_NOT_ALLOWED';
  constructor(messageEn: string, messageAr: string) {
    super(messageEn, { messageAr, messageEn });
  }
}
