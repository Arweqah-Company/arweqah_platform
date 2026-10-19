import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfig } from '../../config/app-config.service';
import { ContentInspector, FileStorage } from './application/file-storage';
import { FilesService } from './application/files.service';
import { FileRepository } from './domain/file.repository';
import { StoredFile } from './domain/stored-file.entity';
import { LocalFileStorage, MagicBytesInspector, S3FileStorage } from './infrastructure/storages';
import { TypeOrmFileRepository } from './infrastructure/typeorm-file.repository';
import { FilesController } from './presentation/files.controller';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([StoredFile])],
  controllers: [FilesController],
  providers: [
    FilesService,
    { provide: ContentInspector, useClass: MagicBytesInspector },
    { provide: FileRepository, useClass: TypeOrmFileRepository },
    {
      provide: FileStorage,
      inject: [AppConfig],
      useFactory: (c: AppConfig) => (c.get('FILE_STORAGE') === 's3' ? new S3FileStorage(c) : new LocalFileStorage(c)),
    },
  ],
  exports: [FilesService],
})
export class FilesModule {}
