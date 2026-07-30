import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { DeleteMultimediaCommand } from '../../commands/delete-multimedia.command';
import {
  MULTIMEDIA_REPOSITORY,
  MultimediaRepositoryPort,
} from '../../ports/multimedia.repository.port';
import { MultimediaAssetPurgeService } from '../../services/multimedia-asset-purge.service';

@CommandHandler(DeleteMultimediaCommand)
export class DeleteMultimediaCommandHandler
  implements ICommandHandler<DeleteMultimediaCommand, { success: true }>
{
  constructor(
    @Inject(MULTIMEDIA_REPOSITORY)
    private readonly repository: MultimediaRepositoryPort,
    private readonly assetPurge: MultimediaAssetPurgeService,
  ) {}

  async execute(
    command: DeleteMultimediaCommand,
  ): Promise<{ success: true }> {
    const asset = await this.repository.findAssetById(command.assetId);

    if (!asset) {
      throw new NotFoundException('Multimedia asset not found');
    }

    const linkCount = await this.repository.countLinksForAsset(command.assetId);

    if (linkCount > 1) {
      throw new Error('Cannot delete a multimedia asset linked to multiple entities');
    }

    await this.repository.removeAllLinksForAsset(command.assetId);
    await this.assetPurge.purgeAsset(asset);

    return { success: true };
  }
}
