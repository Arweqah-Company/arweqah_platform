import { Injectable } from '@nestjs/common';
import { CaptchaVerifier, type CaptchaVerdict } from '../../domain/contracts/captcha-verifier';
import { CAPTCHA_TIMEOUT_MS, TURNSTILE_VERIFY_URL } from '../../application/messages/integrations.messages';

/** Cloudflare Turnstile `siteverify`: a short timeout, and any network or server problem is "unavailable", never "rejected". */
@Injectable()
export class TurnstileVerifier extends CaptchaVerifier {
  async verify(secretKey: string, token: string, ip: string | null): Promise<CaptchaVerdict> {
    const body = new URLSearchParams({ secret: secretKey, response: token });
    if (ip) body.set('remoteip', ip);
    try {
      const response = await fetch(TURNSTILE_VERIFY_URL, { method: 'POST', body, signal: AbortSignal.timeout(CAPTCHA_TIMEOUT_MS) });
      if (!response.ok) return response.status >= 500 ? 'unavailable' : 'rejected';
      const answer = (await response.json()) as { success?: boolean };
      return answer.success === true ? 'ok' : 'rejected';
    } catch {
      return 'unavailable';
    }
  }
}
