import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { ApiErrorBody } from '@arweqah-platform/shared';
import type { Response } from 'express';
import { ZodValidationException } from 'nestjs-zod';
import {
  BusinessRuleError,
  ConflictError,
  DomainError,
  ExternalServiceError,
  ForbiddenError,
  NotFoundError,
} from '../domain/domain-error';

const STATUS_BY_ERROR: [new (...args: never[]) => DomainError, HttpStatus][] = [
  [NotFoundError, HttpStatus.NOT_FOUND],
  [ConflictError, HttpStatus.CONFLICT],
  [ForbiddenError, HttpStatus.FORBIDDEN],
  [BusinessRuleError, HttpStatus.UNPROCESSABLE_ENTITY],
  [ExternalServiceError, HttpStatus.BAD_GATEWAY],
];

/** The one place errors become HTTP responses. Never leaks stacks or SQL. */
@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const body = this.toBody(exception);
    if (body.statusCode >= 500) this.logger.error(exception instanceof Error ? exception.stack : exception);
    res.status(body.statusCode).json(body);
  }

  private toBody(exception: unknown): ApiErrorBody {
    if (exception instanceof ZodValidationException) {
      const issues = exception.getZodError() as { issues?: unknown } | undefined;
      return { statusCode: 400, code: 'VALIDATION', message: 'Invalid request', details: issues?.issues };
    }
    if (exception instanceof DomainError) {
      const status = STATUS_BY_ERROR.find(([type]) => exception instanceof type)?.[1] ?? 400;
      return { statusCode: status, code: exception.code, message: exception.message, details: exception.details };
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return { statusCode: status, code: HttpStatus[status] ?? 'ERROR', message: this.httpMessage(exception) };
    }
    const clientStatus = bodyParserStatus(exception);
    if (clientStatus) return { statusCode: clientStatus, code: HttpStatus[clientStatus] ?? 'BAD_REQUEST', message: 'Invalid request body' };
    return { statusCode: 500, code: 'INTERNAL', message: 'Unexpected error' };
  }

  private httpMessage(exception: HttpException): string {
    const response = exception.getResponse();
    if (typeof response === 'string') return response;
    const message = (response as { message?: unknown }).message;
    return typeof message === 'string' ? message : exception.message;
  }
}

/** body-parser errors (too large, malformed JSON) carry a 4xx `status`; they are client errors, not crashes. */
function bodyParserStatus(exception: unknown): number | null {
  const status = (exception as { status?: unknown; type?: unknown } | null)?.status;
  const isParserError = typeof (exception as { type?: unknown } | null)?.type === 'string';
  return isParserError && typeof status === 'number' && status >= 400 && status < 500 ? status : null;
}
