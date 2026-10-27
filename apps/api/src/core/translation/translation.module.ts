import { Module } from '@nestjs/common';
import { TranslationProbe } from './application/services/translation-probe';
import { TranslationService } from './application/services/translation.service';
import { Translator } from './domain/contracts/translator';
import { TranslatorFactory } from './domain/contracts/translator-factory';
import { ActiveTranslator } from './infrastructure/adapters/active-translator.adapter';
import { ProviderTranslatorFactory } from './infrastructure/adapters/provider-translator.factory';
import { TranslationController } from './presentation/controllers/translation.controller';

@Module({
  controllers: [TranslationController],
  providers: [
    TranslationService,
    TranslationProbe,
    { provide: TranslatorFactory, useClass: ProviderTranslatorFactory },
    { provide: Translator, useClass: ActiveTranslator },
  ],
})
export class TranslationModule {}
