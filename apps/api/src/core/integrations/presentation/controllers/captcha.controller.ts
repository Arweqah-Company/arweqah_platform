import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import type { CaptchaConfigDto } from '@arweqah-platform/shared';
import { CaptchaService } from '../../application/services/captcha.service';

/** Public: the sign-in page asks which bot check to show before anyone is signed in. */
@ApiTags('integrations')
@Controller('captcha')
export class CaptchaController {
  constructor(private readonly captcha: CaptchaService) {}

  @Get('config')
  @AllowAnonymous()
  config(): Promise<CaptchaConfigDto> {
    return this.captcha.config();
  }
}
