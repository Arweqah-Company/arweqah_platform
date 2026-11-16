import type { Response } from 'express';
import { BusinessRuleError, ConflictError, DomainError, ExternalServiceError, ForbiddenError, NotFoundError } from '../../../common/domain/domain-error';

/** Starts a Server-Sent Events answer: no cache, and no buffering by a reverse proxy (nginx would hold the pieces back otherwise). */
export function openEventStream(response: Response): void {
  response.status(200);
  response.setHeader('content-type', 'text/event-stream; charset=utf-8');
  response.setHeader('cache-control', 'no-cache, no-transform');
  response.setHeader('x-accel-buffering', 'no');
  response.flushHeaders();
}

/** One event; nothing is written once the person has gone away. */
export function writeEvent(response: Response, event: string, data: unknown): void {
  if (response.writableEnded || response.destroyed) return;
  response.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

const STATUS: [new (...args: never[]) => DomainError, number][] = [
  [ForbiddenError, 403],
  [NotFoundError, 404],
  [ConflictError, 409],
  [BusinessRuleError, 422],
  [ExternalServiceError, 502],
];

/** What the screen needs to show a failure the way it shows any other: the status, the code and the message (the same words the plain answer would have had). */
export function errorEvent(error: unknown): { status: number; code: string; message: string } {
  if (error instanceof DomainError) return { status: STATUS.find(([type]) => error instanceof type)?.[1] ?? 500, code: error.code, message: error.message };
  return { status: 500, code: 'INTERNAL', message: 'The request could not be completed' };
}
