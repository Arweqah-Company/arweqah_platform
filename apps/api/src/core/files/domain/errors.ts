import { BusinessRuleError } from '../../../common/domain/domain-error';

export class FileTypeNotAllowedError extends BusinessRuleError {
  override readonly code = 'FILE_TYPE_NOT_ALLOWED';
  constructor() {
    super('This file type is not allowed');
  }
}

export class FileTooLargeError extends BusinessRuleError {
  override readonly code = 'FILE_TOO_LARGE';
  constructor() {
    super('The file is too large');
  }
}

export class FileNotPreviewableError extends BusinessRuleError {
  override readonly code = 'FILE_NOT_PREVIEWABLE';
  constructor() {
    super('This file type cannot be shown in the window; download it instead');
  }
}
