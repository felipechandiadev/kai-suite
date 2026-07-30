import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { ReorderMultimediaLinksCommand } from '../../commands/reorder-multimedia-links.command';
import {
  MULTIMEDIA_REPOSITORY,
  MultimediaRepositoryPort,
} from '../../ports/multimedia.repository.port';

@CommandHandler(ReorderMultimediaLinksCommand)
export class ReorderMultimediaLinksCommandHandler
  implements ICommandHandler<ReorderMultimediaLinksCommand, void>
{
  constructor(
    @Inject(MULTIMEDIA_REPOSITORY)
    private readonly repository: MultimediaRepositoryPort,
  ) {}

  execute(command: ReorderMultimediaLinksCommand): Promise<void> {
    return this.repository.reorderLinksForEntity({
      entityType: command.entityType,
      entityId: command.entityId,
      assetIds: command.assetIds,
      usageType: command.usageType,
      attributeId: command.attributeId,
    });
  }
}
