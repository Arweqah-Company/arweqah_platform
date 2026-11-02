/** `ok`: the person passed; `rejected`: the service said the answer is wrong, used or expired; `unavailable`: the service could not be reached in time. */
export type CaptchaVerdict = 'ok' | 'rejected' | 'unavailable';

/** Port to the bot-check service (Cloudflare Turnstile) so the rest of the module never makes the HTTP call itself. */
export abstract class CaptchaVerifier {
  abstract verify(secretKey: string, token: string, ip: string | null): Promise<CaptchaVerdict>;
}
