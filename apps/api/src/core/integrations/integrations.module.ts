import { Global, Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionCatalog } from '../access/application/permission-catalog';
import { ActiveProviders } from './application/services/active-providers.service';
import { IntegrationProvidersService } from './application/services/integration-providers.service';
import { CaptchaProbe } from './application/services/captcha-probe';
import { CaptchaService } from './application/services/captcha.service';
import { CaptchaVerifier } from './domain/contracts/captcha-verifier';
import { TurnstileVerifier } from './infrastructure/adapters/turnstile.verifier';
import { ProbeRegistry } from './application/services/probe-registry';
import { ProviderConfigCodec } from './application/services/provider-config.codec';
import { IntegrationProviderRepository } from './domain/contracts/integration-provider.repository';
import { IntegrationProvider } from './domain/entities/integration-provider.entity';
import { INTEGRATIONS_PERMISSIONS } from './domain/permissions/integrations.permissions';
import { TypeOrmIntegrationProviderRepository } from './infrastructure/repositories/typeorm-integration-provider.repository';
import { CaptchaController } from './presentation/controllers/captcha.controller';
import { CaptchaProvidersController, EmailProvidersController, TranslationProvidersController } from './presentation/controllers/provider-controllers';

/** Which outside service translates and which one sends e-mail, chosen and tried from the dashboard. Global: translation and e-mail read the active provider. */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([IntegrationProvider])],
  controllers: [TranslationProvidersController, EmailProvidersController, CaptchaProvidersController, CaptchaController] as never[],
  providers: [
    IntegrationProvidersService,
    ActiveProviders,
    ProbeRegistry,
    CaptchaService,
    CaptchaProbe,
    { provide: CaptchaVerifier, useClass: TurnstileVerifier },
    ProviderConfigCodec,
    { provide: IntegrationProviderRepository, useClass: TypeOrmIntegrationProviderRepository },
  ],
  exports: [ActiveProviders, ProbeRegistry, CaptchaService],
})
export class IntegrationsModule implements OnModuleInit {
  constructor(private readonly catalog: PermissionCatalog) {}

  onModuleInit(): void {
    this.catalog.register(INTEGRATIONS_PERMISSIONS);
  }
}
