import { Injectable, OnModuleInit } from '@nestjs/common';
import type { ProviderKey, ProviderValues, TestProviderInput, TestResultDto } from '@arweqah-platform/shared';
import { CaptchaVerifier } from '../../domain/contracts/captcha-verifier';
import { ProviderProbe } from '../../domain/contracts/provider-probe';
import { ProviderTestInputError } from '../../domain/errors/integrations.errors';
import { ProbeRegistry } from './probe-registry';

/** How the bot check is tried from the dashboard: the real widget runs in the window and its answer is verified with the keys in the form. */
@Injectable()
export class CaptchaProbe extends ProviderProbe implements OnModuleInit {
  readonly kind = 'captcha' as const;

  constructor(
    private readonly verifier: CaptchaVerifier,
    private readonly registry: ProbeRegistry,
  ) {
    super();
  }

  onModuleInit(): void {
    this.registry.register(this);
  }

  async run(_providerKey: ProviderKey, values: ProviderValues, input: TestProviderInput): Promise<TestResultDto> {
    if (!input.captchaToken) throw new ProviderTestInputError('captchaToken');
    const verdict = await this.verifier.verify(String(values.secretKey), input.captchaToken, null);
    if (verdict === 'ok') return { ok: true, message: null, text: null };
    return { ok: false, message: verdict === 'rejected' ? 'Cloudflare rejected the answer: check that the site key and the secret key belong to the same widget' : 'Cloudflare did not answer in time', text: null };
  }
}
