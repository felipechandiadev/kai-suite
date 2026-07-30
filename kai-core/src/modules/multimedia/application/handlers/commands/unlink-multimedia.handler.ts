import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { UnlinkMultimediaCommand } from '../../commands/unlink-multimedia.command';
import {
  MULTIMEDIA_REPOSITORY,
  MultimediaRepositoryPort,
} from '../../ports/multimedia.repository.port';
import { MultimediaAssetPurgeService } from '../../services/multimedia-asset-purge.service';

@CommandHandler(UnlinkMultimediaCommand)
export class UnlinkMultimediaCommandHandler
  implements ICommandHandler<UnlinkMultimediaCommand, { success: true }>
{
  constructor(
    @Inject(MULTIMEDIA_REPOSITORY)
    private readonly repository: MultimediaRepositoryPort,
    private readonly assetPurge: MultimediaAssetPurgeService,
  ) {}

  async execute(
    command: UnlinkMultimediaCommand,
  ): Promise<{ success: true }> {
    const asset = await this.repository.findAssetById(command.assetId);
    if (!asset) {
      throw new NotFoundException('Multimedia asset not found');
    }

    await this.repository.removeLink({
      assetId: command.assetId,
      entityType: command.entityType,
      entityId: command.entityId,
      usageType: command.usageType,
      attributeId: command.attributeId,
    });

    const remainingLinks = await this.repository.countLinksForAsset(command.assetId);
    if (remainingLinks === 0) {
      await this.assetPurge.purgeAsset(asset);
    }

    return { success: true };
  }
}
