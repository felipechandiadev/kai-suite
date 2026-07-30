import { BaseCommand } from '@shared/cqrs';

export class DeleteMultimediaCommand extends BaseCommand {
  constructor(public readonly assetId: string) {
    super();
  }
}