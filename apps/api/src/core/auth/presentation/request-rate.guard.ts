import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { Request, Response } from 'express';
import { RateWindow } from '../../../common/application/rate-window';
import { SecuritySettingsService } from '../application/security-settings.service';

const WINDOW_MS = 60_000;
const PRUNE_EVERY = 2_000;

/**
 * Every route: one address may send `requestsPerMinute` requests a minute (the administrator's setting), then is told to wait.
 * Kept in memory, so it counts per server instance; the sign-in routes have their own, stricter limit. The health check is never limited.
 */
@Injectable()
export class RequestRateGuard implements CanActivate {
  private readonly window = new RateWindow(Number.MAX_SAFE_INTEGER, WINDOW_MS);
  private calls = 0;

  constructor(private readonly settings: SecuritySettingsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    if (req.path.endsWith('/health') || req.path.includes('/health/')) return true;
    if (++this.calls % PRUNE_EVERY === 0) this.window.prune();
    const limit = await this.settings.get('requestsPerMinute');
    if (this.window.take(req.ip ?? 'unknown', Date.now(), limit)) return true;
    http.getResponse<Response>().setHeader('Retry-After', '60');
    throw new HttpException('Too many requests, try again in a minute', HttpStatus.TOO_MANY_REQUESTS);
  }
}
