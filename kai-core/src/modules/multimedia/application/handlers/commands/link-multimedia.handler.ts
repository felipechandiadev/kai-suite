import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BadRequestException, Inject } from '@nestjs/common';
import { LinkMultimediaCommand } from '../../commands/link-multimedia.command';
import {
  MULTIMEDIA_REPOSITORY,
  MultimediaRepositoryPort,
} from '../../ports/multimedia.repository.port';
import { MultimediaLink } from '../../../domain/multimedia-link.entity';

@CommandHandler(LinkMultimediaCommand)
export class LinkMultimediaCommandHandler
  implements ICommandHandler<LinkMultimediaCommand, MultimediaLink>
{
  constructor(
    @Inject(MULTIMEDIA_REPOSITORY)
    private readonly repository: MultimediaRepositoryPort,
  ) {}

  async execute(command: LinkMultimediaCommand): Promise<MultimediaLink> {
    if (
      command.entityType === 'product-variant' &&
      (command.attributeId == null || !String(command.attributeId).trim())
    ) {
      throw new BadRequestException(
        'Las variantes solo admiten multimedia por atributo (attributeId requerido)',
      );
    }
    const asset = await this.repository.findAssetById(command.assetId);

    if (!asset) {
      throw new Error('Multimedia asset not found');
    }

    return this.repository.createLink({
      assetId: command.assetId,
      entityType: command.entityType,
      entityId: command.entityId,
      usageType: command.usageType,
      sortOrder: command.sortOrder,
      isPrimary: command.isPrimary,
      metadata: command.metadata ?? null,
      attributeId: command.attributeId,
    });
  }
}