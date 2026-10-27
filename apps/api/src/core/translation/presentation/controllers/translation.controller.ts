import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { TranslationDto } from '@arweqah-platform/shared';
import { CurrentUser } from '../../../../common/presentation/current-user.decorator';
import type { SessionUser } from '../../../../common/presentation/request-context';
import { TranslationService } from '../../application/services/translation.service';
import { TranslateInputDto } from '../dtos/translation.dtos';

/** security: self-scoped. Stateless helper for the forms: it stores nothing and reads no records, so it needs no permission key; 30 requests a minute per person. */
@ApiTags('translation')
@Controller('translate')
export class TranslationController {
  constructor(private readonly translation: TranslationService) {}

  @Post()
  @HttpCode(200)
  toEnglish(@CurrentUser() user: SessionUser, @Body() body: TranslateInputDto): Promise<TranslationDto> {
    return this.translation.toEnglish(user.id, body.text);
  }
}
