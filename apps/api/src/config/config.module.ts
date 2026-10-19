import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './env.schema';
import { AppConfig } from './app-config.service';
import { envFilePaths } from './env-files';

@Global()
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, validate: validateEnv, envFilePath: envFilePaths() })],
  providers: [AppConfig],
  exports: [AppConfig],
})
export class AppConfigModule {}
