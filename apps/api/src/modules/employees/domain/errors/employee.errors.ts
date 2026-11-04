import { BusinessRuleError, ConflictError } from '../../../../common/domain/domain-error';

/** A rule on one field of the form; `details.path` lets the UI show the message under that field. */
export class FieldRuleError extends BusinessRuleError {
  override readonly code = 'FIELD_RULE';
  constructor(path: string, message: string, messages?: { ar: string; en: string }) {
    super(message, { path, ...(messages ? { messageAr: messages.ar, messageEn: messages.en } : {}) });
  }
}

/** A plain employee tried to change a field of their own record that only HR or an administrator may change. */
export class FieldNotEditableError extends BusinessRuleError {
  override readonly code = 'FIELD_NOT_EDITABLE';
  constructor(fields: string[]) {
    super('These fields can only be changed by HR or an administrator', {
      path: fields[0],
      fields,
      messageAr: 'هذه البيانات يعدّلها الموارد البشرية أو مدير النظام فقط',
      messageEn: 'These details can only be changed by HR or an administrator',
    });
  }
}

export class EmployeeEmailTakenError extends ConflictError {
  override readonly code = 'EMPLOYEE_EMAIL_TAKEN';
  constructor() {
    super('An employee with this work email already exists', { path: 'workEmail' });
  }
}

export class EmployeeNumberTakenError extends ConflictError {
  override readonly code = 'EMPLOYEE_NUMBER_TAKEN';
  constructor() {
    super('An employee with this number already exists', { path: 'employeeNumber' });
  }
}

export class IdDocumentTakenError extends ConflictError {
  override readonly code = 'ID_DOCUMENT_TAKEN';
  constructor() {
    super('This ID number is already registered for this ID type', { path: 'idNumber' });
  }
}

export class InvalidReferenceError extends BusinessRuleError {
  override readonly code = 'INVALID_REFERENCE';
  constructor() {
    super('One of the selected options does not exist');
  }
}

export class SelfActionError extends BusinessRuleError {
  override readonly code = 'SELF_ACTION';
}

/** A field that can never be changed by the person themselves was switched on for them. */
export class FieldNeverSelfEditableError extends BusinessRuleError {
  override readonly code = 'FIELD_NEVER_SELF_EDITABLE';
  constructor(fields: string[]) {
    super('These details can never be changed by the employee themselves', {
      fields,
      messageAr: 'هذه البيانات (هوية أو عقد أو راتب أو الاسم) لا يمكن أن يعدّلها الموظف بنفسه',
      messageEn: 'These details (identity, contract, pay or the name) can never be changed by the employee themselves',
    });
  }
}
