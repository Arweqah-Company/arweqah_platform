import { CaptchaVerifier, type CaptchaVerdict } from '../../src/core/integrations/domain/contracts/captcha-verifier';

/** Turnstile stand-in: the token says what the service would answer ("good", "down", anything else is rejected). */
export class FakeCaptchaVerifier extends CaptchaVerifier {
  readonly calls: { secretKey: string; token: string; ip: string | null }[] = [];

  async verify(secretKey: string, token: string, ip: string | null): Promise<CaptchaVerdict> {
    this.calls.push({ secretKey, token, ip });
    if (token === 'good') return 'ok';
    return token === 'down' ? 'unavailable' : 'rejected';
  }
}
