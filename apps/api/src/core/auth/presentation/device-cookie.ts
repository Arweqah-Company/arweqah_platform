import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../../common/presentation/request-context';

export const DEVICE_COOKIE = 'arweqah_device';
const DAY_MS = 86_400_000;

/** The secret of the trusted-device cookie, if the browser sent one. */
export function deviceSecretOf(req: AuthenticatedRequest): string | undefined {
  const header = req.headers.cookie ?? '';
  const found = header.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${DEVICE_COOKIE}=`));
  const value = found?.slice(DEVICE_COOKIE.length + 1);
  return value ? decodeURIComponent(value) : undefined;
}

/** HttpOnly so a script cannot read it, and only sent to this site. */
export function setDeviceCookie(res: Response, secret: string, days: number, secure: boolean): void {
  res.cookie(DEVICE_COOKIE, secret, { httpOnly: true, sameSite: 'lax', secure, path: '/', maxAge: days * DAY_MS });
}
