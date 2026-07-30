import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { SetPrimaryMultimediaLinkCommand } from '../../commands/set-primary-multimedia-link.command';
import {
  MULTIMEDIA_REPOSITORY,
  MultimediaRepositoryPort,
} from '../../ports/multimedia.repository.port';

@CommandHandler(SetPrimaryMultimediaLinkCommand)
export class SetPrimaryMultimediaLinkCommandHandler
  implements ICommandHandler<SetPrimaryMultimediaLinkCommand, void>
{
  constructor(
    @Inject(MULTIMEDIA_REPOSITORY)
    private readonly repository: MultimediaRepositoryPort,
  ) {}

  async execute(command: SetPrimaryMultimediaLinkCommand): Promise<void> {
    await this.repository.setPrimaryAssetForEntity({
      assetId: command.assetId,
      entityType: command.entityType,
      entityId: command.entityId,
      attributeId: command.attributeId,
    });
  }
}
