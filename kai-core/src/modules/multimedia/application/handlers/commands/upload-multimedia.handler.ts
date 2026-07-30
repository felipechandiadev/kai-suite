import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { BadRequestException, Logger } from '@nestjs/common';
import { UploadMultimediaCommand } from '../../commands/upload-multimedia.command';
import { MultimediaAsset } from '../../../domain/multimedia-asset.entity';
import { MultimediaIngestService } from '../../media-optimization/multimedia-ingest.service';
import { enrichMultimediaAssetForApi } from '../../utils/resolve-multimedia-urls.util';

@CommandHandler(UploadMultimediaCommand)
export class UploadMultimediaCommandHandler
  implements ICommandHandler<UploadMultimediaCommand, MultimediaAsset>
{
  private readonly logger = new Logger(UploadMultimediaCommandHandler.name);

  constructor(
    private readonly ingestService: MultimediaIngestService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: UploadMultimediaCommand): Promise<MultimediaAsset> {
    if (
      command.entityType === 'product-variant' &&
      (command.attributeId == null || !String(command.attributeId).trim())
    ) {
      throw new BadRequestException(
        'Las variantes solo admiten multimedia por atributo (attributeId requerido)',
      );
    }

    const asset = await this.ingestService.ingest({
      file: command.file,
      entityType: command.entityType,
      entityId: command.entityId,
      usageType: command.usageType,
      isPrimary: command.isPrimary,
      metadata: command.metadata,
      attributeId: command.attributeId,
    });

    this.logger.debug(
      `Uploaded multimedia asset ${asset.id} (optimization=${asset.optimizationStatus})`,
    );
    this.eventBus.publish({
      type: 'multimedia.uploaded',
      assetId: asset.id,
      entityType: command.entityType,
      entityId: command.entityId,
    });

    return enrichMultimediaAssetForApi(asset) as MultimediaAsset;
  }
}
