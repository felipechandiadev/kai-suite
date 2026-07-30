import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigService } from '../../config/config.service';
import { AppConfigModule } from '../../config/config.module';
import { MultimediaController } from './presentation/multimedia.controller';
import { MultimediaServiceAdapter } from './application/services/multimedia.service.adapter';
import { MultimediaAsset } from './domain/multimedia-asset.entity';
import { MultimediaLink } from './domain/multimedia-link.entity';
import { MultimediaVariant } from './domain/multimedia-variant.entity';
import {
  MULTIMEDIA_REPOSITORY,
} from './application/ports/multimedia.repository.port';
import { STORAGE_PROVIDER } from './application/ports/storage-provider.port';
import { TypeOrmMultimediaRepository } from './infrastructure/repositories/typeorm-multimedia.repository';
import { LocalStorageAdapter } from './infrastructure/adapters/local-storage.adapter';
import { CloudflareR2Adapter } from './infrastructure/adapters/cloudflare-r2.adapter';
import { MultimediaStorageRegistry } from './application/services/multimedia-storage.registry';
import { MultimediaAssetPurgeService } from './application/services/multimedia-asset-purge.service';
import { UploadMultimediaCommandHandler } from './application/handlers/commands/upload-multimedia.handler';
import { DeleteMultimediaCommandHandler } from './application/handlers/commands/delete-multimedia.handler';
import { LinkMultimediaCommandHandler } from './application/handlers/commands/link-multimedia.handler';
import { UnlinkMultimediaCommandHandler } from './application/handlers/commands/unlink-multimedia.handler';
import { GetMultimediaAssetQueryHandler } from './application/handlers/queries/get-multimedia-asset.handler';
import { ListMultimediaAssetsQueryHandler } from './application/handlers/queries/list-multimedia-assets.handler';
import { ListMultimediaAssetsByEntityIdsQueryHandler } from './application/handlers/queries/list-multimedia-assets-by-entity-ids.handler';
import { SetPrimaryMultimediaLinkCommandHandler } from './application/handlers/commands/set-primary-multimedia-link.handler';
import { ReorderMultimediaLinksCommandHandler } from './application/handlers/commands/reorder-multimedia-links.handler';
import { ImageStrategyRegistry } from './application/media-optimization/image-strategy.registry';
import { SharpProcessorService } from './application/media-optimization/sharp-processor.service';
import { MultimediaIngestService } from './application/media-optimization/multimedia-ingest.service';

@Module({
  imports: [
    AppConfigModule,
    TypeOrmModule.forFeature([MultimediaAsset, MultimediaLink, MultimediaVariant]),
    CqrsModule,
  ],
  controllers: [MultimediaController],
  providers: [
    MultimediaServiceAdapter,
    UploadMultimediaCommandHandler,
    DeleteMultimediaCommandHandler,
    LinkMultimediaCommandHandler,
    UnlinkMultimediaCommandHandler,
    GetMultimediaAssetQueryHandler,
    ListMultimediaAssetsQueryHandler,
    ListMultimediaAssetsByEntityIdsQueryHandler,
    SetPrimaryMultimediaLinkCommandHandler,
    ReorderMultimediaLinksCommandHandler,
    LocalStorageAdapter,
    CloudflareR2Adapter,
    MultimediaStorageRegistry,
    MultimediaAssetPurgeService,
    ImageStrategyRegistry,
    SharpProcessorService,
    MultimediaIngestService,
    {
      provide: MULTIMEDIA_REPOSITORY,
      useClass: TypeOrmMultimediaRepository,
    },
    {
      provide: STORAGE_PROVIDER,
      useFactory: (
        configService: AppConfigService,
        localStorage: LocalStorageAdapter,
        cloudflareStorage: CloudflareR2Adapter,
      ) => {
        if (configService.storage.strategy === 'cloudflare') {
          return cloudflareStorage;
        }

        return localStorage;
      },
      inject: [AppConfigService, LocalStorageAdapter, CloudflareR2Adapter],
    },
  ],
  exports: [MultimediaServiceAdapter, MultimediaIngestService],
})
export class MultimediaModule {}
