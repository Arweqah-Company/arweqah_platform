/** Base for every business error. The exception filter maps subclasses to HTTP statuses. */
export abstract class DomainError extends Error {
  abstract readonly code: string;
  constructor(
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';
  constructor(entity: string, id?: string) {
    super(id ? `${entity} ${id} was not found` : `${entity} was not found`);
  }
}

export class ConflictError extends DomainError {
  readonly code: string = 'CONFLICT';
}

export class ForbiddenError extends DomainError {
  readonly code: string = 'FORBIDDEN';
  constructor(message = 'You do not have permission to perform this action') {
    super(message);
  }
}

export class BusinessRuleError extends DomainError {
  readonly code: string = 'BUSINESS_RULE';
}

export class ExternalServiceError extends DomainError {
  readonly code: string = 'EXTERNAL_SERVICE';
}
